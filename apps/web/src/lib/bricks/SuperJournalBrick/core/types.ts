/**
 * SuperJournal Types - Deep Memory System
 * Immutable record of all conversations from the beginning of time
 */

import type { MessagePairSet } from '../../MessageTurnBrick/types/MessageTurn.types';

export interface JournalEntry {
  id: string;                // UUID v4
  timestamp: number;         // Unix timestamp (ms)
  turnNumber: number;        // Global sequential counter
  bossMessage: string;       // User input
  samaraMessage: string;     // Assistant response  
  checksum: string;          // SHA-256 hash for integrity
  metadata: JournalMetadata;
  
  // Machine-trimmed versions for storage efficiency
  trimmedData?: {
    bossMessage: string;
    samaraMessage: string;
    metadata: {
      hasDecisions: boolean;
      isInferable: boolean;
      priority: 'high' | 'medium' | 'low';
    };
  };
  
  // Lifecycle management
  createdAt: number;         // When originally created
  deletedAt?: number;        // Soft delete timestamp
  status: 'active' | 'deleted' | 'archived';
}

// New MessagePairSet-based entry for future compatibility
export interface MessagePairSetEntry extends Omit<JournalEntry, 'bossMessage' | 'samaraMessage' | 'trimmedData'> {
  messagePairSet: MessagePairSet;
}

export interface JournalMetadata {
  sessionId: string;         // Browser session identifier
  model?: string;            // LLM model used
  persona?: string;          // Active persona
  streamDuration?: number;   // Time to complete stream (ms)
  userAgent?: string;        // Browser info
  timezone?: string;         // User timezone
}

export interface JournalManifest {
  totalEntries: number;
  firstEntry: number | null;  // Timestamp of first entry
  lastEntry: number | null;   // Timestamp of last entry
  totalTokens: number;        // Estimated token count
  checksum: string;           // Manifest integrity hash
}

export interface SuperJournalConfig {
  apiEndpoint: string;
  writeInterval: number;      // Debounce writes (ms)
  retryAttempts: number;
  retryDelay: number;        // Retry delay (ms)
}

export interface WriteResponse {
  success: boolean;
  entryId: string;
  timestamp: number;
  r2Key: string;             // R2 object key
  error?: string;
}

export interface ReadQuery {
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
  sessionId?: string;
}

export interface ReadResponse {
  entries: JournalEntry[];
  total: number;
  hasMore: boolean;
}