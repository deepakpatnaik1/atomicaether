/**
 * SuperJournal Events - Standard LEGO Connectors
 * Rule 2 Compliant: EventBus-only communication
 * Rule 4 Compliant: Standard connectors for loose coupling
 */

import type { MessagePairEntry } from '../services/R2Service';

// Event payloads for type safety
export interface TurnCompletedPayload {
  turn: {
    id: string;
    bossMessage: { content: string };
    samaraMessage?: { content: string; model?: string };
    turnNumber: number;
    completedAt?: number;
    startedAt: number;
  };
}

export interface SuperJournalSavedPayload {
  entryId: string;
  r2Key: string;
  timestamp: number;
}

export interface SuperJournalErrorPayload {
  entryId: string;
  error: string;
  timestamp: number;
}

// Event type definitions for TypeScript safety
export type SuperJournalEventMap = {
  // Input events (what SuperJournalBrick listens to)
  'turn:completed': TurnCompletedPayload;
  
  // Output events (what SuperJournalBrick publishes)
  'superjournal:saved': SuperJournalSavedPayload;
  'superjournal:error': SuperJournalErrorPayload;
};

// Event constants for consistency
export const SUPERJOURNAL_EVENTS = {
  // Input
  TURN_COMPLETED: 'turn:completed',
  
  // Output  
  SAVED: 'superjournal:saved',
  ERROR: 'superjournal:error'
} as const;

/**
 * Convert MessageTurn to MessagePairEntry
 * Rule 3: Thin transformation layer
 */
export function turnToMessagePair(turn: TurnCompletedPayload['turn']): MessagePairEntry {
  return {
    id: turn.id,
    timestamp: turn.completedAt || turn.startedAt || Date.now(),
    userMessage: turn.bossMessage.content,
    assistantMessage: turn.samaraMessage?.content || '',
    model: turn.samaraMessage?.model || 'unknown',
    turnNumber: turn.turnNumber
  };
}