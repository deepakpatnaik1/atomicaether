/**
 * OpenAIService
 * Handles API calls to GPT models
 */

import type { LLMRequest, LLMResponse, LLMStreamChunk } from '../models/LLMModels';

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
      machineTrim: data.machineTrim, // Pass through machine trim data
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
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield {
              id: 'final',
              model: request.model,
              delta: '',
              finished: true
            };
            continue;
          }
          
          try {
            const event = JSON.parse(data);
            
            // Check for error in the stream
            if (event.error) {
              console.error('OpenAI API Error:', event.error);
              throw new Error(event.error);
            }
            
            const delta = event.choices[0]?.delta?.content;
            
            if (delta) {
              yield {
                id: event.id,
                model: event.model,
                delta: delta,
                finished: false
              };
            }
          } catch (e) {
            console.warn('Failed to parse SSE event:', e);
            console.warn('Raw data that failed:', data);
          }
        }
      }
    }
  }
}