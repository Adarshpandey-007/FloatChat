import { NextResponse } from 'next/server';
import { checkSpatialCompliance, searchLegalVectors } from '../../../../lib/mcp/legalTools';
import { getGroqClient, DEFAULT_MODEL } from '../../../../lib/llm/client';
import type OpenAI from 'openai';

const SYSTEM_PROMPT = `You are FloatChat's "Legal Expert", a specialized AI trained in multi-jurisdictional environmental law.
Your role is to help government officials, project managers, and advocates understand the legal constraints of coastal development.

You have access to two tools:
1. check_spatial_compliance: Given a latitude and longitude, checks if the location falls inside any legally protected zones (e.g., Marine Protected Areas, CRZ zones).
2. search_legal_vectors: Searches a database of environmental laws (e.g., CRZ, UNCLOS) for specific text or concepts.

CORE BEHAVIORS:
1. Always cite specific laws or zones when answering.
2. If asked about a specific location, ALWAYS use check_spatial_compliance first to understand the zoning.
3. If asked about a rule or regulation, use search_legal_vectors to find the exact text.
4. Provide clear, structured answers using Markdown. Use bullet points for checklists.
5. Remind users that this is an AI advisory service and does not replace formal legal counsel.`;

const legalTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'check_spatial_compliance',
      description: 'Check if a specific latitude and longitude fall inside any legally protected zones (e.g., Marine Protected Areas, CRZ zones).',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude' },
          lon: { type: 'number', description: 'Longitude' }
        },
        required: ['lat', 'lon'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_legal_vectors',
      description: 'Search a database of environmental laws for specific text or concepts.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query (e.g., "brine discharge regulations")' },
          jurisdiction: { type: 'string', description: 'Optional jurisdiction to filter by (e.g., "India", "International", "All"). Default is "All".' }
        },
        required: ['query'],
      },
    },
  }
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { text, history, jurisdictionContext } = body;

    const groqClient = getGroqClient();
    if (!groqClient) {
      return NextResponse.json({ message: 'LLM API Key missing.' }, { status: 500 });
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    if (Array.isArray(history)) {
      for (const item of history) {
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
    }

    const userPrompt = jurisdictionContext 
      ? `[User explicitly selected Jurisdiction: ${jurisdictionContext}]\n\nUser Question: ${text}`
      : `User Question: ${text}`;

    messages.push({
      role: 'user',
      content: userPrompt
    });

    let iterations = 0;
    const MAX_ITERATIONS = 3;
    let toolsUsed: string[] = [];
    let finalMessage = '';

    while (iterations < MAX_ITERATIONS) {
      const response = await groqClient.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        tools: legalTools,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      const choiceMessage = choice?.message;
      if (!choiceMessage) break;

      if (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
        iterations++;
        messages.push(choiceMessage);

        for (const tc of choiceMessage.tool_calls) {
          toolsUsed.push(tc.function.name);
          let args: any = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}');
          } catch {
            args = {};
          }

          let tr = '';
          if (tc.function.name === 'check_spatial_compliance') {
            tr = await checkSpatialCompliance(args.lat as number, args.lon as number);
          } else if (tc.function.name === 'search_legal_vectors') {
            tr = await searchLegalVectors(args.query as string, (args.jurisdiction as string) || jurisdictionContext || 'All');
          } else {
            tr = `Unknown tool: ${tc.function.name}`;
          }

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: tr || 'Completed',
          });
        }
      } else {
        finalMessage = choiceMessage.content || '';
        break;
      }
    }

    if (!finalMessage) {
      finalMessage = "I have reviewed your legal compliance query against the maritime regulations database.";
    }

    return NextResponse.json({
      message: finalMessage,
      toolsUsed: [...new Set(toolsUsed)]
    });

  } catch (error: any) {
    console.error('Legal Query API Error:', error);
    return NextResponse.json({ message: `Error: ${error.message}` }, { status: 500 });
  }
}
