import { GoogleGenAI } from "@google/genai";

export type AIProvider = 'gemini' | 'openrouter' | 'groq' | 'modal';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
}

export interface AIResponse {
  text: string;
  error?: string;
}

export async function generateAIContent(prompt: string, config: AIConfig): Promise<AIResponse> {
  // Always call Gemini from the frontend as per guidelines
  if (config.provider === 'gemini') {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) throw new Error("Gemini API Key not found. Please check your environment variables.");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: config.model || 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
        }
      });
      
      return { text: response.text || "" };
    } catch (error: any) {
      console.error("Gemini Service Error:", error);
      // Extract clean error message if it's a JSON string from the API
      let msg = error.message || "Unknown Gemini error";
      try {
        if (msg.includes('{')) {
          const parsed = JSON.parse(msg.substring(msg.indexOf('{')));
          msg = parsed.error?.message || msg;
        }
      } catch (e) {}
      return { text: "", error: msg };
    }
  }

  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, config })
    });

    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If not JSON, try to get text
        try {
          const text = await response.text();
          if (text && text.length < 200) errorMessage = text;
        } catch (e2) {}
      }
      throw new Error(errorMessage);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("JSON Parse Error. Response status:", response.status);
      throw new Error(`Failed to parse server response as JSON. Status: ${response.status}`);
    }
    return { text: data.text };
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return { text: "", error: error.message || "Unknown AI error" };
  }
}

export const AI_MODELS: Record<AIProvider, string[]> = {
  gemini: ['gemini-3-flash-preview', 'gemini-3.1-pro-preview', 'gemini-flash-latest'],
  openrouter: [
    'google/gemini-2.0-flash-001',
    'anthropic/claude-3.5-sonnet',
    'meta-llama/llama-3.1-405b-instruct',
    'mistralai/mistral-7b-instruct',
    'openai/gpt-4o-mini'
  ],
  groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  modal: ['zai-org/GLM-5.1-FP8']
};
