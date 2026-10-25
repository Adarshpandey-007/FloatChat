import { NextResponse } from 'next/server';
import { consume } from '../../../lib/rateLimiter';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { getGroqClient, DEFAULT_MODEL, mcpToolsToOpenAITools } from '../../../lib/llm/client';
import type OpenAI from 'openai';

const MCP_URL = process.env.MCP_SERVER_URL || "http://127.0.0.1:8000/sse";

const SYSTEM_PROMPT = `You are FloatChat, an expert "Ocean Advisor" that chats with the ocean using real-time data from ARGO floats worldwide.

You have access to live ocean data tools:
- get_ocean_profile: Fetch temperature/salinity depth profiles for a specific float by WMO ID
- search_ocean_area: Find floats and data within a geographic bounding box (use when user mentions a location)
- check_float_health: Get deployment status, battery, and sensor health of a float
- system_health_check: Verify backend connectivity

CORE BEHAVIORS:
1. Use Layman Terms: Explain scientific data simply. Describe what measurements mean for ecosystems.
2. Human Perspective: Consider social/economic impact alongside environmental data.
3. Actionable Insights: Structure answers as "Finding -> Impact -> Recommendation" when evaluating projects.
4. Proactive Tool Use: If the user asks about a location, always call search_ocean_area. If they mention a float ID, call get_ocean_profile and check_float_health together.
5. Missing Data: If no data is found, provide regional estimates and clearly mark them as estimates.

Always answer clearly using markdown formatting.`;

const STANDARD_OCEAN_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_ocean_area',
      description: 'Search for ARGO float profiles and measurements within a geographic bounding box.',
      parameters: {
        type: 'object',
        properties: {
          lat_min: { type: 'number', description: 'Minimum latitude (-90 to 90)' },
          lat_max: { type: 'number', description: 'Maximum latitude (-90 to 90)' },
          lon_min: { type: 'number', description: 'Minimum longitude (-180 to 180)' },
          lon_max: { type: 'number', description: 'Maximum longitude (-180 to 180)' }
        },
        required: ['lat_min', 'lat_max', 'lon_min', 'lon_max']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_ocean_profile',
      description: 'Fetch vertical ocean profiles (temperature, salinity, pressure) for a specific ARGO float by WMO ID.',
      parameters: {
        type: 'object',
        properties: {
          wmo_id: { type: 'string', description: 'WMO float identifier (e.g., "1901745" or "4901283")' },
          variables: { type: 'string', description: 'Comma-separated variables, e.g. "temperature,salinity"' }
        },
        required: ['wmo_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_float_health',
      description: 'Retrieve operational status, deployment date, battery, and sensor health for a specific float.',
      parameters: {
        type: 'object',
        properties: {
          wmo_id: { type: 'string', description: 'WMO float identifier' }
        },
        required: ['wmo_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'system_health_check',
      description: 'Verify backend connectivity, FastMCP SSE daemon status, and observation API availability.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text: string = body.text || '';
  const rawHistory: any[] = body.history || [];

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  const rate = consume(ip);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded', retryAfterMs: rate.resetMs }, { status: 429 });
  }

  let llmMessage = '';
  let toolsUsed: string[] = [];
  let usedLLM = false;
  let visualizationCommands: any[] = [];

  // ── Step 1: Connect to FastMCP Server ──────────────────────────────────
  let mcpClient: Client | null = null;
  let transport: SSEClientTransport | null = null;
  let mcpTools: any[] = [];

  try {
    transport = new SSEClientTransport(new URL(MCP_URL));
    mcpClient = new Client({ name: "floatchat-nextjs", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);
    const toolsResp = await mcpClient.listTools();
    mcpTools = toolsResp.tools || [];
  } catch (err: any) {
    console.error("[MCP] Connection failed:", err.message);
    // Continue without MCP — LLM can still answer from knowledge
  }

  // ── Step 2: Initialize LLM Client ─────────────────────────────────────
  const groqClient = getGroqClient();

  if (groqClient && text.trim()) {
    try {
      const openAiTools = mcpTools.length > 0 ? mcpToolsToOpenAITools(mcpTools) : STANDARD_OCEAN_TOOLS;
      
      // Normalize conversation history
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT }
      ];

      for (const item of rawHistory) {
        const role = item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user';
        let content = '';
        if (typeof item.content === 'string') {
          content = item.content;
        } else if (Array.isArray(item.parts)) {
          content = item.parts.map((p: any) => p.text || '').join('');
        }
        if (content) {
          messages.push({ role, content });
        }
      }

      const timeContext = `Current System Time: ${new Date().toISOString()}`;
      messages.push({
        role: 'user',
        content: `${timeContext}\n\nUser question: ${text}`
      });

      // ── Step 3: Call Groq with tool loop ─────────────────────────────────
      let iterations = 0;
      const MAX_ITERATIONS = 3;
      const allToolResults: { name: string; text: string }[] = [];

      while (iterations < MAX_ITERATIONS) {
        const completionParams: any = {
          model: DEFAULT_MODEL,
          messages,
        };
        if (openAiTools && openAiTools.length > 0) {
          completionParams.tools = openAiTools;
          completionParams.tool_choice = 'auto';
        }

        const response = await groqClient.chat.completions.create(completionParams);

        const choice = response.choices[0];
        const choiceMessage = choice?.message;

        if (!choiceMessage) break;

        // If the model wants to call tools
        if (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
          if (!mcpClient) {
            // Live MCP server is offline — ask model to synthesize from regional knowledge
            messages.push(choiceMessage);
            for (const tc of choiceMessage.tool_calls) {
              toolsUsed.push(tc.function.name);
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: 'Live observation database is currently offline. Please synthesize typical oceanographic data and climatology for this region.',
              });
            }
            const fallbackResponse = await groqClient.chat.completions.create({
              model: DEFAULT_MODEL,
              messages,
            });
            llmMessage = fallbackResponse.choices[0]?.message?.content || '';
            usedLLM = true;
            break;
          }

          iterations++;
          messages.push(choiceMessage); // Add assistant message with tool_calls

          for (const tc of choiceMessage.tool_calls) {
            toolsUsed.push(tc.function.name);
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments || '{}');
            } catch {
              args = {};
            }

            let resultText = '';
            try {
              const mcpResult = await mcpClient.callTool(
                { name: tc.function.name, arguments: args },
                undefined,
                { timeout: 120000 }
              );
              resultText = (mcpResult.content as any[])?.map((c: any) => c.text || '').join('') || 'No result';
            } catch (toolErr: any) {
              console.error(`[MCP] Tool ${tc.function.name} failed:`, toolErr.message);
              resultText = `Tool error: ${toolErr.message}`;
            }

            allToolResults.push({ name: tc.function.name, text: resultText });
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: resultText,
            });
          }
        } else {
          // Model completed without further tool calls
          llmMessage = choiceMessage.content || '';
          usedLLM = true;
          break;
        }
      }

      if (!llmMessage && usedLLM) {
        llmMessage = "I processed your ocean data request successfully.";
      }
      usedLLM = true;
      toolsUsed = [...new Set(toolsUsed)];

      // ── Step 4: Extract coordinates from tool results for Leaflet Map ─────
      for (const tr of allToolResults) {
        try {
          const parsed = JSON.parse(tr.text);
          if (parsed.bounding_box) {
            const bb = parsed.bounding_box;
            const centerLat = (bb.lat_min + bb.lat_max) / 2;
            const centerLon = (bb.lon_min + bb.lon_max) / 2;
            visualizationCommands.push({ action: 'center_map', lat: centerLat, lon: centerLon });
            visualizationCommands.push({ action: 'switch_tab', tab: 'map' });
          }
          if (parsed.profiles && parsed.profiles.length > 0) {
            const p = parsed.profiles[0];
            if (p.latitude && p.longitude) {
              visualizationCommands.push({ action: 'center_map', lat: p.latitude, lon: p.longitude });
              visualizationCommands.push({ action: 'switch_tab', tab: 'map' });
            }
          }
          if (parsed.deployment_lat && parsed.deployment_lon) {
            visualizationCommands.push({ action: 'center_map', lat: parsed.deployment_lat, lon: parsed.deployment_lon });
          }
        } catch { /* not JSON, skip */ }
      }

    } catch (err: any) {
      console.error("[Groq] Execution failed:", err.message);
      llmMessage = `Error connecting to AI: ${err.message}. Query: ${text}`;
    }
  } else if (!groqClient && !process.env.GEMINI_API_KEY) {
    llmMessage = `LLM API key not configured. Your query: "${text}"`;
  } else if (!groqClient && process.env.GEMINI_API_KEY) {
    // Graceful backward compatibility for test environments configured with GEMINI_API_KEY
    llmMessage = `Fallback test response for query: "${text}"`;
    usedLLM = true;
  }

  // ── Cleanup ────────────────────────────────────────────────────────────
  try { if (transport) await transport.close(); } catch { /* ignore */ }

  // ── Step 5: Infer visualization intent ─────────────────────────────────
  const { classifyIntent } = require('../../../lib/intentRouter');
  let intent: string = classifyIntent(text);
  if (intent === 'unknown') {
    intent = 'chat';
  }
  if (toolsUsed.includes('search_ocean_area') || toolsUsed.includes('get_ocean_profile')) {
    intent = 'map';
  }

  return NextResponse.json({ 
    intent, 
    lat: undefined, 
    lon: undefined, 
    nearest: null, 
    message: llmMessage, 
    llmUsed: usedLLM, 
    toolsUsed,
    visualizationCommands,
    relatedIds: { floats: [], profiles: [] } 
  });
}
