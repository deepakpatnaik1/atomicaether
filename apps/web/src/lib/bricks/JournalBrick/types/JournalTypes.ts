/**
 * JournalBrick Types - Machine Trim Response Storage
 * LEGO Brick for atomicaether-journal R2 bucket operations
 */

export interface MachineTrimResponse {
  user_message: string;
  ai_response: string;
  inferability: "stored" | "inferable_acknowledgment" | "not_stored";
}

export interface JournalEntry {
  id: string;
  turnId: string;
  timestamp: number;
  user_message: string;
  ai_response: string;
  inferability: "stored" | "inferable_acknowledgment" | "not_stored";
  metadata: {
    persona: string;
    model: string;
    original_length: number;
    compressed_length: number;
    compression_ratio: number;
  };
}

export interface JournalConfig {
  bucketName: string;
  region: string;
  endpoint: string;
  dateOrganized: boolean;
  retryAttempts: number;
  timeoutMs: number;
}

export interface JournalOperationResult {
  success: boolean;
  error?: string;
  key?: string;
  timestamp: number;
}

export interface JournalStoreEvent {
  turnId: string;
  success: boolean;
  key?: string;
  error?: string;
}

export interface JournalDeleteEvent {
  turnId: string;
  success: boolean;
  error?: string;
}

export interface JournalListResult {
  entries: JournalEntry[];
  hasMore: boolean;
  nextToken?: string;
}