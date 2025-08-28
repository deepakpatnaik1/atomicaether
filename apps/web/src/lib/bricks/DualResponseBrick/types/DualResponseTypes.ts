/**
 * DualResponseBrick Type Definitions
 * Types for dual-response generation with normal and machine-trimmed outputs
 */

import type { MachineTrimResponse } from '$lib/bricks/JournalBrick/types/JournalTypes';

export interface DualResponse {
  normal_response: string;
  machine_trim: MachineTrimResponse;
  generation_metadata: DualResponseMetadata;
}

export interface DualResponseMetadata {
  model: string;
  persona: string;
  timestamp: number;
  compression_ratio: number;
  parsing_success: boolean;
  generation_time_ms: number;
  original_length: number;
  compressed_length: number;
}

export interface DualResponseRequest {
  user_message: string;
  system_prompt: string;
  persona: string;
  model: string;
  timestamp?: number;
}

export interface DualResponseConfig {
  dualResponsePrompt: string;
  machineTrimsDelimiter: string;
  fallbackBehavior: 'normal_only' | 'error' | 'retry';
  timeoutMs: number;
  maxRetries: number;
  compressionTarget: number;
  enableInferabilityDetection: boolean;
  debugMode: boolean;
}

export interface DualResponseResult {
  success: boolean;
  response?: DualResponse;
  error?: string;
  fallback_used?: boolean;
  retry_count?: number;
  timestamp: number;
}

export interface ParsedLLMOutput {
  normal_response: string;
  machine_trim_raw?: string;
  parsing_success: boolean;
  delimiter_found: boolean;
  compression_ratio: number;
}

export interface DualResponseEvent {
  type: 'dual-response:generated' | 'dual-response:parsed' | 'dual-response:error' | 'dual-response:fallback';
  data: {
    success: boolean;
    persona: string;
    model: string;
    compression_ratio?: number;
    parsing_success?: boolean;
    fallback_used?: boolean;
    error?: string;
    timestamp: number;
  };
}