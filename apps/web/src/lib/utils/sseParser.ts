/**
 * SSE Parser Utility
 * 
 * Following Essential Boss Rules:
 * - Rule 1 (Webby): Uses native ReadableStream, TextDecoder APIs
 * - Rule 3 (Thin): Simple utility, not over-engineered
 * - Rule 6 (Don't Reinvent): One implementation for all providers
 * - Rule 9 (Debug with Discipline): Robust error handling without breaking
 */

import type { LLMStreamChunk } from '../bricks/LLMBrick/models/LLMModels';

type ProviderType = 'anthropic' | 'openai' | 'fireworks';

/**
 * Parse SSE stream from LLM API response
 * Handles the common SSE parsing logic across all providers
 */
export async function* parseSSEStream(
  response: Response,
  providerType: ProviderType
): AsyncGenerator<LLMStreamChunk> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body for streaming');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Build buffer from chunks
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          // Handle stream termination
          if (data === '[DONE]') {
            yield {
              id: 'final',
              model: 'unknown',
              delta: '',
              finished: true
            };
            continue;
          }

          // Skip empty data lines
          if (!data) continue;

          try {
            const event = JSON.parse(data);
            const chunk = parseEventByProvider(event, providerType);
            if (chunk) yield chunk;
          } catch (parseError) {
            console.warn(`Failed to parse SSE event for ${providerType}:`, parseError);
            console.warn('Raw data:', data);
            // Don't throw - continue processing other chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse provider-specific event format into standard chunk
 */
function parseEventByProvider(
  event: any, 
  providerType: ProviderType
): LLMStreamChunk | null {
  
  switch (providerType) {
    case 'anthropic':
      return parseAnthropicEvent(event);
    
    case 'openai':
      return parseOpenAIEvent(event);
    
    case 'fireworks':
      return parseFireworksEvent(event);
    
    default:
      console.warn('Unknown provider type:', providerType);
      return null;
  }
}

/**
 * Parse Anthropic-specific event format
 */
function parseAnthropicEvent(event: any): LLMStreamChunk | null {
  if (event.type === 'content_block_delta') {
    return {
      id: event.index?.toString() || 'chunk',
      model: 'anthropic',
      delta: event.delta?.text || '',
      finished: false
    };
  }
  
  if (event.type === 'message_stop') {
    return {
      id: 'final',
      model: 'anthropic', 
      delta: '',
      finished: true
    };
  }
  
  return null; // Ignore other event types
}

/**
 * Parse OpenAI-specific event format
 */
function parseOpenAIEvent(event: any): LLMStreamChunk | null {
  const choice = event.choices?.[0];
  if (!choice) return null;
  
  const delta = choice.delta?.content;
  
  if (delta) {
    return {
      id: event.id || 'chunk',
      model: event.model || 'openai',
      delta: delta,
      finished: false
    };
  }
  
  // Check for finish reason
  if (choice.finish_reason) {
    return {
      id: event.id || 'final',
      model: event.model || 'openai',
      delta: '',
      finished: true
    };
  }
  
  return null;
}

/**
 * Parse Fireworks-specific event format
 * Usually follows OpenAI format
 */
function parseFireworksEvent(event: any): LLMStreamChunk | null {
  // Fireworks generally follows OpenAI format
  return parseOpenAIEvent(event);
}