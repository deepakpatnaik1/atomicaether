/**
 * SuperJournal v2 - Event Definitions
 * Events published and consumed by SuperJournalBrick
 */

export interface SuperJournalSavedEvent {
  entryId: string;
  timestamp: number;
  r2Key: string;
}

export interface SuperJournalErrorEvent {
  entryId: string;
  error: string;
  retryCount: number;
  willRetry: boolean;
}

export interface SuperJournalRetryEvent {
  entryId: string;
  attempt: number;
  maxAttempts: number;
}

export interface SuperJournalSyncRestoredEvent {
  entryId: string;
  retriesRequired: number;
}

export interface SuperJournalStatusUpdatedEvent {
  entryId: string;
  oldStatus: 'active' | 'deleted';
  newStatus: 'active' | 'deleted';
}

/**
 * Event names used in EventBus communication
 */
export const SUPERJOURNAL_EVENTS = {
  // Listen for these events
  TURN_COMPLETED: 'turn:completed',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_RESTORED: 'message:restored',
  
  // Publish these events
  SAVED: 'superjournal:saved',
  ERROR: 'superjournal:error', 
  RETRY: 'superjournal:retry',
  SYNC_RESTORED: 'superjournal:sync-restored',
  STATUS_UPDATED: 'superjournal:status-updated'
} as const;