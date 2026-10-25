import { NextResponse } from 'next/server';
import { NATURE_ADVOCATE_CHAT_PROMPT } from '../../../../lib/planner/prompts';
import { executeGetNearestFloats } from '../../../../lib/mcp/toolExecutor';
import { checkSpatialCompliance } from '../../../../lib/mcp/legalTools';
import { geocodeLocation } from '../../../../lib/mcp/geocoding';
import { query } from '../../../../lib/db';
import { getGroqClient, DEFAULT_MODEL, extractTextFromPDF, extractMessageContent } from '../../../../lib/llm/client';
import type OpenAI from 'openai';

const plannerTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'geocode_location',
      description: 'Convert a natural language location name (like "Mumbai" or "Gulf of Kutch") into precise Latitude and Longitude coordinates.',
      parameters: {
        type: 'object',
        properties: {
          locationName: { type: 'string', description: 'Name of the place' }
        },
        required: ['locationName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_spatial_compliance',
      description: 'Check if coordinates fall inside legally protected zones (CRZ, MPA).',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude in decimal degrees' },
          lon: { type: 'number', description: 'Longitude in decimal degrees' }
        },
        required: ['lat', 'lon'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_get_nearest_floats',
      description: 'Fetch nearest ARGO floats and their recent oceanographic data (temperature, salinity).',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude' },
          lon: { type: 'number', description: 'Longitude' }
        },
        required: ['lat', 'lon'],
      },
    },
  }
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { text, history, fileData, mimeType } = body;

    const groqClient = getGroqClient();
    if (!groqClient) {
      return NextResponse.json({ message: 'LLM API Key missing.' }, { status: 500 });
    }

    // ── Build normalized message history ─────────────────────────────────
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: NATURE_ADVOCATE_CHAT_PROMPT }
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

    // ── Handle Multimodal Attachments (PDFs, Images, Documents) ──────────
    let userPromptText = text || 'Please evaluate this proposal.';

    if (fileData && mimeType) {
      if (mimeType === 'application/pdf') {
        const extractedPdfText = await extractTextFromPDF(fileData);
        if (extractedPdfText.trim()) {
          userPromptText += `\n\n[Attached PDF Document Content]:\n${extractedPdfText}`;
        } else {
          userPromptText += `\n\n[Note: User attached a PDF document, but text could not be extracted directly.]`;
        }
      } else if (mimeType.startsWith('text/')) {
        try {
          const textContent = Buffer.from(fileData, 'base64').toString('utf-8');
          userPromptText += `\n\n[Attached Document Text]:\n${textContent}`;
        } catch { /* skip */ }
      }
    }

    // Check if this is an image input for multimodal vision
    if (fileData && mimeType && mimeType.startsWith('image/')) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPromptText },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${fileData}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: userPromptText
      });
    }

    // ── Execute Tool-Calling Loop with Groq ───────────────────────────────
    let iterations = 0;
    const MAX_ITERATIONS = 4;
    let toolsUsed: string[] = [];
    let discoveredLat: number | null = null;
    let discoveredLon: number | null = null;
    let finalMessage = '';

    while (iterations < MAX_ITERATIONS) {
      const response = await groqClient.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        tools: plannerTools,
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
          if (tc.function.name === 'geocode_location') {
            const res = await geocodeLocation(args.locationName as string);
            if (res) {
              discoveredLat = res.lat;
              discoveredLon = res.lon;
              tr = `Geocoded ${args.locationName} to Lat: ${res.lat}, Lon: ${res.lon}`;
            } else {
              tr = `Failed to geocode location ${args.locationName}.`;
            }
          } else if (tc.function.name === 'check_spatial_compliance') {
            discoveredLat = args.lat as number;
            discoveredLon = args.lon as number;
            tr = await checkSpatialCompliance(args.lat as number, args.lon as number);
          } else if (tc.function.name === 'execute_get_nearest_floats') {
            tr = await executeGetNearestFloats(args.lat as number, args.lon as number, 3);
          }

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: tr || 'Completed',
          });
        }
      } else {
        finalMessage = extractMessageContent(choiceMessage);
        break;
      }
    }

    if (!finalMessage) {
      finalMessage = "I have evaluated the proposal with current environmental criteria.";
    }

    // ── Check if the AI generated an assessment card ─────────────────────
    let assessment = null;
    const match = finalMessage.match(/```json_assessment\n([\s\S]*?)\n```/);
    if (match) {
      try {
        assessment = JSON.parse(match[1]);
        
        // Save project asynchronously if coordinates were discovered
        if (discoveredLat !== null && discoveredLon !== null) {
          query(
            `INSERT INTO planned_projects (name, project_type, description, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5)`,
            ["Conversational Project", "Custom", "Extracted from chat", discoveredLat, discoveredLon]
          ).catch(e => console.error("Error saving conversational project", e));
        }
      } catch (e) {
        console.error("Failed to parse JSON assessment from chat", e);
      }
    }

    return NextResponse.json({
      message: finalMessage,
      assessment: assessment,
      toolsUsed: [...new Set(toolsUsed)]
    });

  } catch (error: any) {
    console.error('Planner Chat API Error:', error);
    return NextResponse.json({ message: `Error: ${error.message}` }, { status: 500 });
  }
}
