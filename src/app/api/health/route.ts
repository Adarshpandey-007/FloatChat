import { NextResponse } from 'next/server';

export async function GET() {
  const hasLLM = !!process.env.GROQ_API_KEY || !!process.env.GEMINI_API_KEY || typeof process.env.NEXT_PUBLIC_GEMINI_PRESENT !== 'undefined';
  const realProfileSource = process.env.NEXT_PUBLIC_REAL_PROFILE_SOURCE || process.env.REAL_PROFILE_SOURCE || 'cache';
  const llmProvider = process.env.GROQ_API_KEY ? 'Groq (openai/gpt-oss-120b)' : (process.env.GEMINI_API_KEY ? 'Google Gemini' : 'None');

  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: {
      hasLLM,
      llmProvider,
      realProfileSource
    }
  });
}
