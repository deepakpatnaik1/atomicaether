/**
 * OpenAIService
 * Handles API calls to GPT models
 */

import type { LLMRequest, LLMResponse, LLMStreamChunk } from '../models/LLMModels';
import { parseSSEStream } from '../../../utils/sseParser';

export class OpenAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Use our API endpoint instead of direct API call
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: `openai-${Date.now()}`,
      model: data.model || request.model,
      content: data.content,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    };
  }

  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    // Use our API endpoint for streaming
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
        fileUrls: request.fileUrls || []
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    // Use shared SSE parser
    yield* parseSSEStream(response, 'openai');
  }
}