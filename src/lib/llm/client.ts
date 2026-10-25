import OpenAI from 'openai';

export const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
export const FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b';

/**
 * Returns an OpenAI-compatible client configured for Groq Cloud.
 */
export function getGroqClient(): OpenAI | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1',
  });
}

/**
 * Convert Model Context Protocol (MCP) tool schemas into standard OpenAI tool declarations.
 */
export function mcpToolsToOpenAITools(mcpTools: any[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return mcpTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema || { type: 'object', properties: {} },
    },
  }));
}

/**
 * Extract clean plain text from base64-encoded PDF data on the server.
 */
export async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    // @ts-ignore
    const pdfModule = await import('pdf-parse');
    const parsePdf = (pdfModule as any).PDFParse || (pdfModule as any).default || pdfModule;
    const data = await parsePdf(buffer);
    return data.text || '';
  } catch (err: any) {
    console.error('[PDF Extraction] Failed to parse PDF text:', err?.message || err);
    return '';
  }
}
