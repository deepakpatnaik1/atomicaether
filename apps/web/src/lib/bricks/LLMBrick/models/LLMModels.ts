/**
 * LLMBrick Models
 * Type definitions for LLM providers and models
 */

export interface LLMModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  outputTokens: number;
  tier: 'flagship' | 'balanced' | 'efficient';
  capabilities: ('text' | 'vision' | 'streaming' | 'function-calling' | 'multilingual')[];
}

export interface LLMProvider {
  name: string;
  apiKeyEnv: string;
  baseUrl: string;
  models: LLMModel[];
}

export interface LLMRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: {
        url: string;
      };
    }>;
  }>;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  fileUrls?: string[];
}

export interface LLMResponse {
  id: string;
  model: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMStreamChunk {
  id: string;
  model: string;
  delta: string;
  finished: boolean;
}

export interface LLMConfig {
  providers: Record<string, LLMProvider>;
  defaultModel: string;
  modelGroups: Record<string, {
    name: string;
    description: string;
    models: string[];
  }>;
}