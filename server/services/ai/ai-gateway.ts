/**
 * AI Gateway Service
 *
 * Unified interface for all AI providers:
 * - Anthropic Claude (complex reasoning, safety-critical)
 * - OpenAI GPT-4 (embeddings, fine-tuning, general tasks)
 * - Perplexity (real-time search, regulatory updates)
 * - Google Gemini (multimodal, large context)
 */

import Anthropic from '@anthropic-ai/sdk';

// Configuration
const AI_CONFIG = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: 'claude-sonnet-4-20250514',
    maxTokens: 4096
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    defaultModel: 'gpt-4-turbo-preview',
    embeddingModel: 'text-embedding-3-large'
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    defaultModel: 'sonar-pro'
  },
  gemini: {
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    defaultModel: 'gemini-1.5-pro'
  }
};

// Types
export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  metadata?: Record<string, any>;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICompletionOptions {
  provider?: 'anthropic' | 'openai' | 'perplexity' | 'gemini';
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  tools?: any[];
}

export interface EmbeddingResponse {
  success: boolean;
  embedding?: number[];
  error?: string;
  dimensions: number;
}

// Cost per 1K tokens (approximate)
const TOKEN_COSTS = {
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'sonar-pro': { input: 0.003, output: 0.015 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 }
};

/**
 * AI Gateway - Unified interface for all AI providers
 */
class AIGateway {
  private anthropicClient: Anthropic | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    // Initialize Anthropic
    if (AI_CONFIG.anthropic.apiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: AI_CONFIG.anthropic.apiKey
      });
    }
  }

  /**
   * Get completion from AI provider
   */
  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AIResponse> {
    const provider = options.provider || 'anthropic';

    try {
      switch (provider) {
        case 'anthropic':
          return await this.completeWithAnthropic(messages, options);
        case 'openai':
          return await this.completeWithOpenAI(messages, options);
        case 'perplexity':
          return await this.completeWithPerplexity(messages, options);
        case 'gemini':
          return await this.completeWithGemini(messages, options);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error: any) {
      console.error(`[AI Gateway] ${provider} error:`, error.message);

      // Fallback logic
      if (provider !== 'anthropic' && this.anthropicClient) {
        console.log('[AI Gateway] Falling back to Anthropic');
        return await this.completeWithAnthropic(messages, options);
      }

      return {
        success: false,
        error: error.message,
        provider,
        model: options.model || 'unknown'
      };
    }
  }

  /**
   * Anthropic Claude completion
   */
  private async completeWithAnthropic(
    messages: AIMessage[],
    options: AICompletionOptions
  ): Promise<AIResponse> {
    if (!this.anthropicClient) {
      return {
        success: false,
        error: 'Anthropic client not initialized',
        provider: 'anthropic',
        model: options.model || AI_CONFIG.anthropic.defaultModel
      };
    }

    const model = options.model || AI_CONFIG.anthropic.defaultModel;
    const maxTokens = options.maxTokens || AI_CONFIG.anthropic.maxTokens;

    // Separate system message
    const systemMessage = messages.find(m => m.role === 'system')?.content || options.systemPrompt;
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await this.anthropicClient.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemMessage,
      messages: chatMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    });

    const content = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || { input: 0, output: 0 };
    const estimatedCost = (response.usage.input_tokens * costs.input / 1000) +
                          (response.usage.output_tokens * costs.output / 1000);

    return {
      success: true,
      content,
      provider: 'anthropic',
      model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        estimatedCost
      }
    };
  }

  /**
   * OpenAI GPT completion
   */
  private async completeWithOpenAI(
    messages: AIMessage[],
    options: AICompletionOptions
  ): Promise<AIResponse> {
    if (!AI_CONFIG.openai.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
        provider: 'openai',
        model: options.model || AI_CONFIG.openai.defaultModel
      };
    }

    const model = options.model || AI_CONFIG.openai.defaultModel;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || { input: 0, output: 0 };
    const estimatedCost = (data.usage.prompt_tokens * costs.input / 1000) +
                          (data.usage.completion_tokens * costs.output / 1000);

    return {
      success: true,
      content,
      provider: 'openai',
      model,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        estimatedCost
      }
    };
  }

  /**
   * Perplexity completion (for real-time search)
   */
  private async completeWithPerplexity(
    messages: AIMessage[],
    options: AICompletionOptions
  ): Promise<AIResponse> {
    if (!AI_CONFIG.perplexity.apiKey) {
      return {
        success: false,
        error: 'Perplexity API key not configured',
        provider: 'perplexity',
        model: options.model || AI_CONFIG.perplexity.defaultModel
      };
    }

    const model = options.model || AI_CONFIG.perplexity.defaultModel;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.perplexity.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      success: true,
      content,
      provider: 'perplexity',
      model,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        estimatedCost: 0
      },
      metadata: {
        citations: data.citations || []
      }
    };
  }

  /**
   * Google Gemini completion
   */
  private async completeWithGemini(
    messages: AIMessage[],
    options: AICompletionOptions
  ): Promise<AIResponse> {
    if (!AI_CONFIG.gemini.apiKey) {
      return {
        success: false,
        error: 'Gemini API key not configured',
        provider: 'gemini',
        model: options.model || AI_CONFIG.gemini.defaultModel
      };
    }

    const model = options.model || AI_CONFIG.gemini.defaultModel;

    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: {
            maxOutputTokens: options.maxTokens || 4096,
            temperature: options.temperature || 0.7
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      success: true,
      content,
      provider: 'gemini',
      model,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
        estimatedCost: 0
      }
    };
  }

  /**
   * Generate embeddings (OpenAI)
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    if (!AI_CONFIG.openai.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured for embeddings',
        dimensions: 0
      };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: AI_CONFIG.openai.embeddingModel,
          input: text
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI embedding error: ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.data[0]?.embedding || [];

      return {
        success: true,
        embedding,
        dimensions: embedding.length
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        dimensions: 0
      };
    }
  }

  /**
   * Smart router - choose best provider based on task
   */
  async smartComplete(
    messages: AIMessage[],
    taskType: 'reasoning' | 'search' | 'multimodal' | 'embedding' | 'simple',
    options: AICompletionOptions = {}
  ): Promise<AIResponse> {
    let provider: AICompletionOptions['provider'];
    let model: string | undefined;

    switch (taskType) {
      case 'reasoning':
        // Complex reasoning - use Claude
        provider = 'anthropic';
        model = 'claude-sonnet-4-20250514';
        break;
      case 'search':
        // Real-time search - use Perplexity
        provider = 'perplexity';
        model = 'sonar-pro';
        break;
      case 'multimodal':
        // Image + text - use Gemini
        provider = 'gemini';
        model = 'gemini-1.5-pro';
        break;
      case 'simple':
        // Simple tasks - use Haiku for cost
        provider = 'anthropic';
        model = 'claude-3-haiku-20240307';
        break;
      default:
        provider = 'anthropic';
    }

    return this.complete(messages, { ...options, provider, model });
  }

  /**
   * Check if providers are configured
   */
  getProviderStatus(): Record<string, boolean> {
    return {
      anthropic: !!AI_CONFIG.anthropic.apiKey,
      openai: !!AI_CONFIG.openai.apiKey,
      perplexity: !!AI_CONFIG.perplexity.apiKey,
      gemini: !!AI_CONFIG.gemini.apiKey
    };
  }
}

// Export singleton instance
export const aiGateway = new AIGateway();
export default aiGateway;
