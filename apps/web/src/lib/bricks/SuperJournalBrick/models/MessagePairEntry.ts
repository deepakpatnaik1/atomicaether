/**
 * SuperJournal v2 - Message Pair Entry Models
 * Single entry per conversation with built-in status field
 */

export interface MessagePairEntry {
  id: string;                    // UUID v4
  timestamp: number;             // Unix timestamp (ms) - millisecond precision
  timezone: string;              // User timezone (e.g., "America/New_York")
  status: 'active' | 'deleted';  // Built-in status field (no separate deletion markers)
  userMessage: string;           // User input (e.g., "What is a comet?")
  assistantMessage: string;      // Complete streamed response
  metadata: MessagePairMetadata;
}

export interface MessagePairMetadata {
  sessionId: string;             // Browser session identifier
  model: string;                 // LLM model used (e.g., "claude-opus-4-1-20250805")
  persona?: string;              // Active persona (e.g., "user")
  streamDuration: number;        // Time to complete stream (ms)
  userAgent: string;             // Browser info
  checksum: string;              // SHA-256 hash for integrity verification
}

export interface SuperJournalConfig {
  retryAttempts: number;         // Number of retry attempts for failed saves
  retryDelay: number;            // Delay between retries (ms)
  bucketName: string;            // R2 bucket name
  endpoint: string;              // R2 API endpoint
}

export interface SaveResponse {
  success: boolean;
  entryId: string;
  timestamp: number;
  r2Key: string;                 // R2 object key
  error?: string;
}

export interface ReadQuery {
  startTime?: number;            // Filter by timestamp range
  endTime?: number;
  status?: 'active' | 'deleted' | 'all';  // Filter by status
  limit?: number;                // Pagination limit
  offset?: number;               // Pagination offset
  sessionId?: string;            // Filter by session
}

export interface ReadResponse {
  entries: MessagePairEntry[];
  total: number;
  hasMore: boolean;
}