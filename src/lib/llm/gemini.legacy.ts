import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeToolCalls, type ToolCall } from '../mcp/toolExecutor';

const MODEL = 'gemini-2.5-flash';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

// Schema type enum for @google/generative-ai v0.x (doesn't export Type)
const SchemaType = {
  STRING: 'STRING' as const,
  NUMBER: 'NUMBER' as const,
  OBJECT: 'OBJECT' as const,
};

const SYSTEM_PROMPT = `You are FloatChat, an expert "Ocean Advisor" helping government officials, policymakers, and coastal planners make sustainable, nature-friendly decisions based on ARGO float data.

You have access to a PostgreSQL database with the following schema:
- floats(id, wmo_id, launch_date, last_observation, geom)
- profiles(id, float_id, cycle_number, timestamp, latitude, longitude, min_depth, max_depth, qc_status)
- measurements(id, profile_id, depth, temperature, salinity)
- profile_stats(profile_id, mean_temp, mean_salinity, surface_temp, mixed_layer_depth)

CORE BEHAVIORS:
1. Use Layman Terms: Explain scientific concepts simply. Instead of just giving numbers, explain what they mean for the ecosystem (e.g., coral reefs, fish).
2. Human Perspective: Always consider the social and economic impact on local communities (e.g., fishermen, tourism) alongside the environmental data.
3. Actionable Insights: If evaluating a project, provide a clear "Finding -> Impact -> Recommendation" structure.
4. Auto-Control UI: Use the 'control_visualization' tool proactively. If a user asks about a location, center the map there. If they ask about salinity, switch to the plot tab and load a relevant profile.
5. Missing Data Handling: If a database query returns no results, synthesize an estimated answer based on historical/regional knowledge, but clearly state "⚠️ Estimated based on regional patterns".

Always answer clearly, using markdown formatting for readability.`;

const queryArgoSqlDeclaration = {
  name: 'query_argo_sql',
  description: 'Execute a read-only SQL query against the ARGO PostgreSQL database. Use this for specific data lookups, aggregations, or statistics. Schema: floats(id, wmo_id, launch_date, last_observation, geom), profiles(id, float_id, cycle_number, timestamp, latitude, longitude, min_depth, max_depth), measurements(id, profile_id, depth, temperature, salinity), profile_stats(profile_id, mean_temp, mean_salinity, surface_temp, mixed_layer_depth).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'The SQL SELECT query to execute.' },
    },
    required: ['query'],
  },
};

const searchArgoVectorDeclaration = {
  name: 'search_argo_vector',
  description: 'Perform a semantic search over ARGO float profile summaries to find floats matching conceptual descriptions like "warm waters", "deep profiles", or "Arabian Sea floats with high salinity".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'The natural language search query.' },
      n_results: { type: SchemaType.NUMBER, description: 'Number of results to return (default 5).' },
    },
    required: ['query'],
  },
};

const getNearestFloatsDeclaration = {
  name: 'get_nearest_floats',
  description: 'Find the nearest ARGO floats to a specific latitude and longitude using spatial distance calculation.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      lat: { type: SchemaType.NUMBER, description: 'Latitude in decimal degrees (positive=North)' },
      lon: { type: SchemaType.NUMBER, description: 'Longitude in decimal degrees (positive=East)' },
      limit: { type: SchemaType.NUMBER, description: 'Max number of floats to return (default 5).' },
    },
    required: ['lat', 'lon'],
  },
};

const controlVisualizationDeclaration = {
  name: 'control_visualization',
  description: 'Auto-control the user interface. Emit this tool call to change the active tab, center the map, or load specific float data into the plot/table.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      action: { type: SchemaType.STRING, description: 'The action to perform: "switch_tab", "center_map", or "load_profile"' },
      tab: { type: SchemaType.STRING, description: 'If action is "switch_tab", which tab to switch to ("map", "plot", "table")' },
      lat: { type: SchemaType.NUMBER, description: 'If action is "center_map", the latitude' },
      lon: { type: SchemaType.NUMBER, description: 'If action is "center_map", the longitude' },
      float_id: { type: SchemaType.STRING, description: 'If action is "load_profile", the float WMO ID to load' },
    },
    required: ['action'],
  },
};

const toolDeclarations = [queryArgoSqlDeclaration, searchArgoVectorDeclaration, getNearestFloatsDeclaration, controlVisualizationDeclaration];

export interface LLMResponse {
  text: string;
  toolCalls: ToolCall[];
  toolResults: { name: string; result: string }[];
  usedTools: boolean;
  visualizationCommands: any[];
}

/**
 * Generate an LLM response with automatic tool execution.
 * 
 * Flow:
 * 1. Send user prompt to Gemini with tool declarations
 * 2. If Gemini returns tool calls, execute them against real DB
 * 3. Send tool results back to Gemini for final synthesis
 * 4. Return the final synthesized answer
 */
export async function generateLLMResponse(
  userPrompt: string, 
  context?: string, 
  history: {role: string, parts: {text: string}[]}[] = []
): Promise<LLMResponse> {
  const client = getClient();
  if (!client) return { text: "LLM API Key missing.", toolCalls: [], toolResults: [], usedTools: false, visualizationCommands: [] };
  
  try {
    const model = client.getGenerativeModel({ 
      model: MODEL,
      tools: [{
        functionDeclarations: toolDeclarations as any,
      }],
      systemInstruction: SYSTEM_PROMPT,
    });

    // Start a chat session for multi-turn tool execution, injecting history
    const chat = model.startChat({ history });
    
    // Build initial prompt with context (time/location)
    const timeContext = `Current System Time: ${new Date().toISOString()}`;
    const fullPrompt = context 
      ? `${timeContext}\n${context}\n\nUser question: ${userPrompt}`
      : `${timeContext}\n\nUser question: ${userPrompt}`;
    
    // First turn: send user prompt
    let result = await chat.sendMessage(fullPrompt);
    let response = result.response;
    
    let allToolCalls: ToolCall[] = [];
    let allToolResults: { name: string; result: string }[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 3; // Prevent infinite tool loops
    
    // Tool execution loop
    while (iterations < MAX_ITERATIONS) {
      const calls = response.functionCalls?.() || [];
      
      if (calls.length === 0) break; // No more tool calls, we have the final answer
      
      iterations++;
      const toolCalls = calls.map(c => ({ name: c.name, args: c.args as Record<string, any> }));
      allToolCalls.push(...toolCalls);
      
      console.log(`[Gemini] Tool calls (iteration ${iterations}):`, toolCalls.map(t => t.name).join(', '));
      
      // Execute tools against real database
      const toolResults = await executeToolCalls(toolCalls);
      allToolResults.push(...toolResults);
      
      console.log(`[Gemini] Tool results received, sending back to model...`);
      
      // Send tool results back to Gemini as function responses
      const functionResponses = toolResults.map(tr => ({
        functionResponse: {
          name: tr.name,
          response: { result: tr.result },
        },
      }));
      
      // Next turn: feed tool results for synthesis
      result = await chat.sendMessage(functionResponses as any);
      response = result.response;
    }
    
    // Extract visualization commands and text
    let text = '';
    let visualizationCommands = [];
    try {
      text = response.text() || '';
    } catch {
      // text() throws when response only contains function calls
    }

    // Separate UI control calls from real data tool calls
    visualizationCommands = allToolCalls
      .filter(c => c.name === 'control_visualization')
      .map(c => c.args);
    
    const dataToolCalls = allToolCalls.filter(c => c.name !== 'control_visualization');

    return {
      text: text || (dataToolCalls.length > 0 ? "I retrieved data but couldn't generate a summary." : "No response generated."),
      toolCalls: dataToolCalls,
      toolResults: allToolResults.filter(r => r.name !== 'control_visualization'),
      usedTools: dataToolCalls.length > 0,
      visualizationCommands,
    };
  } catch (err: any) {
    console.error('Gemini invocation failed', err?.message || err);
    return { text: `Error connecting to AI service: ${err?.message || 'Unknown error'}`, toolCalls: [], toolResults: [], usedTools: false, visualizationCommands: [] };
  }
}
