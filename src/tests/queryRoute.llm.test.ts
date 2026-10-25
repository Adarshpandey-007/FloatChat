/** @jest-environment node */
import { POST } from '../app/api/query/route';

jest.mock('../lib/llm/client', () => {
  return {
    DEFAULT_MODEL: 'openai/gpt-oss-120b',
    mcpToolsToOpenAITools: jest.fn().mockReturnValue([]),
    getGroqClient: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockImplementation(async () => {
              return {
                choices: [
                  {
                    message: {
                      content: 'LLM ANSWER MOCK',
                      tool_calls: []
                    }
                  }
                ]
              };
            })
          }
        }
      };
    })
  };
});

describe('POST /api/query with LLM', () => {
  it('returns llmUsed true when key present and LLM returns text', async () => {
    const req = new Request('http://localhost/api/query', { 
      method: 'POST', 
      body: JSON.stringify({ text: 'show temperature profile' }), 
      headers: { 'content-type': 'application/json' } 
    });
    const res: any = await POST(req as unknown as Request);
    const json = await res.json();
    expect(json.llmUsed).toBe(true);
    expect(json.message).toBe('LLM ANSWER MOCK');
    expect(json.intent).toBe('plot');
  });
});
