// AI Service for multiple providers (Gemini, OpenRouter, Groq)
export type AIProvider = 'gemini' | 'openrouter' | 'groq';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIConfig {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

class AIService {
  private getProviderConfig(provider: AIProvider): { apiKey: string; baseUrl: string; defaultModel: string } {
    switch (provider) {
      case 'gemini':
        return {
          apiKey: process.env.GEMINI_API_KEY || '',
          baseUrl: 'https://generativelanguage.googleapis.com',
          defaultModel: 'gemini-2.5-pro'
        };
      case 'openrouter':
        return {
          apiKey: process.env.OPENROUTER_API_KEY || '',
          baseUrl: 'https://openrouter.ai/api/v1',
          defaultModel: 'anthropic/claude-3.5-sonnet'
        };
      case 'groq':
        return {
          apiKey: process.env.GROQ_API_KEY || '',
          baseUrl: 'https://api.groq.com/openai/v1',
          defaultModel: 'llama-3.1-70b-versatile'
        };
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  async generateContent(
    messages: AIMessage[],
    config: AIConfig = { provider: 'gemini' }
  ): Promise<AIResponse> {
    const { provider, model, temperature = 0.7, maxTokens = 4096, apiKey } = config;
    const providerConfig = this.getProviderConfig(provider);
    const finalApiKey = apiKey || providerConfig.apiKey;
    const finalModel = model || providerConfig.defaultModel;

    if (!finalApiKey) {
      throw new Error(`API key not configured for ${provider}. Please set the appropriate environment variable.`);
    }

    try {
      switch (provider) {
        case 'gemini':
          return await this.callGemini(messages, finalApiKey, finalModel, temperature, maxTokens);
        case 'openrouter':
          return await this.callOpenRouter(messages, finalApiKey, finalModel, temperature, maxTokens);
        case 'groq':
          return await this.callGroq(messages, finalApiKey, finalModel, temperature, maxTokens);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error: any) {
      // Handle rate limits and quota errors
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
        throw new Error(`Rate limit exceeded for ${provider}. Please try again later.`);
      }
      if (error?.message?.includes('billing') || error?.message?.includes('quota')) {
        throw new Error(`${provider} API quota exhausted. Please check your billing details.`);
      }
      throw error;
    }
  }

  private async callGemini(
    messages: AIMessage[],
    apiKey: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: 'text/plain'
      }
    });

    return {
      text: response.text || '',
      usage: (response as any).usage ? {
        promptTokens: (response as any).usage.promptTokenCount || (response as any).usage.inputTokens,
        completionTokens: (response as any).usage.candidatesTokenCount || (response as any).usage.outputTokens,
        totalTokens: (response as any).usage.totalTokenCount || ((response as any).usage.inputTokens + (response as any).usage.outputTokens)
      } : undefined
    };
  }

  private async callOpenRouter(
    messages: AIMessage[],
    apiKey: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || '',
        'X-Title': 'DocuExtract'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      text: choice?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    };
  }

  private async callGroq(
    messages: AIMessage[],
    apiKey: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      text: choice?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    };
  }

  // Vision API for image processing (currently only supported by Gemini)
  async generateContentWithImage(
    messages: AIMessage[],
    imageData: string,
    mimeType: string,
    config: AIConfig = { provider: 'gemini' }
  ): Promise<AIResponse> {
    const { provider } = config;

    if (provider !== 'gemini') {
      throw new Error('Vision API is currently only supported by Gemini provider');
    }

    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    // For vision, we need to structure the content differently
    const contents = messages.map((msg, index) => {
      if (index === messages.length - 1) {
        // Last message includes the image
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [
            { inlineData: { mimeType, data: imageData } },
            { text: msg.content }
          ]
        };
      } else {
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        };
      }
    });

    const response = await ai.models.generateContent({
      model: config.model || 'gemini-2.5-pro',
      contents,
      config: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 8192,
        responseMimeType: 'text/plain'
      }
    });

    return {
      text: response.text || '',
      usage: (response as any).usage ? {
        promptTokens: (response as any).usage.promptTokenCount || (response as any).usage.inputTokens,
        completionTokens: (response as any).usage.candidatesTokenCount || (response as any).usage.outputTokens,
        totalTokens: (response as any).usage.totalTokenCount || ((response as any).usage.inputTokens + (response as any).usage.outputTokens)
      } : undefined
    };
  }
}

export const aiService = new AIService();

// Helper function to get available providers
export function getAvailableProviders(): { value: AIProvider; label: string; models: string[] }[] {
  const providers = [
    {
      value: 'gemini' as AIProvider,
      label: 'Google Gemini',
      models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
    },
    {
      value: 'openrouter' as AIProvider,
      label: 'OpenRouter',
      models: [
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'meta-llama/llama-3.1-405b-instruct',
        'minimax/minimax-m2.5:free',
        'nvidia/llama-nemotron-embed-vl-1b-v2:free',
        'nvidia/nemotron-3-super-120b-a12b:free',
        'arcee-ai/trinity-large-preview:free',
        'liquid/lfm-2.5-1.2b-thinking:free',
        'liquid/lfm-2.5-1.2b-instruct:free',
        'nvidia/nemotron-3-nano-30b-a3b:free',
        'sourceful/riverflow-v2-max-preview',
        'black-forest-labs/flux.2-klein-4b',
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'qwen/qwen3-next-80b-a3b-instruct:free',
        'nvidia/nemotron-nano-9b-v2:free',
        'openai/gpt-oss-120b:free',
        'z-ai/glm-4.5-air:free',
        'openai/gpt-oss-20b:free',
        'qwen/qwen3-coder:free',
        'meta-llama/llama-3.3-70b-instruct:free'
      ]
    },
    {
      value: 'groq' as AIProvider,
      label: 'Groq',
      models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma-7b-it']
    }
  ];

  // Filter out providers that don't have API keys configured
  return providers.filter(provider => {
    switch (provider.value) {
      case 'gemini':
        return !!process.env.GEMINI_API_KEY;
      case 'openrouter':
        return !!process.env.OPENROUTER_API_KEY;
      case 'groq':
        return !!process.env.GROQ_API_KEY;
      default:
        return false;
    }
  });
}

// Get default provider from environment
export function getDefaultProvider(): AIProvider {
  const defaultProvider = (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'gemini';
  const availableProviders = getAvailableProviders();

  // Check if the default provider is available
  if (availableProviders.find(p => p.value === defaultProvider)) {
    return defaultProvider;
  }

  // Fallback to first available provider
  return availableProviders[0]?.value || 'gemini';
}