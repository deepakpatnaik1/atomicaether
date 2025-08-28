/**
 * Deletion Event Type Definitions
 * 
 * Following Rule 2 (Four Buses) - Standard event definitions for EventBus
 */

export interface TurnDeleteRequestEvent {
  deletionId?: string;
  turnId: string;
  requestedBy?: string;
  reason?: string;
  priority?: 'low' | 'normal' | 'high';
  timestamp: number;
}

export interface DeletionStartedEvent {
  deletionId: string;
  turnId: string;
  operationsCount: number;
  timestamp: number;
}

export interface DeletionCompleteEvent {
  deletionId: string;
  turnId: string;
  success: true;
  operationsCount: number;
  performance: {
    totalTimeMs: number;
    operationsTimeMs: number;
    retryCount: number;
  };
  timestamp: number;
}

export interface DeletionErrorEvent {
  deletionId: string;
  turnId?: string;
  success: false;
  error: string;
  rollback?: {
    required: boolean;
    completed: boolean;
    operations: string[];
  };
  timestamp: number;
}

export interface DeletionRollbackEvent {
  deletionId: string;
  turnId: string;
  rollback: {
    required: boolean;
    completed: boolean;
    operations: string[];
    error?: string;
  };
  timestamp: number;
}

// Event type union for type safety
export type DeletionEventTypes = 
  | 'turn:delete:request'
  | 'deletion:started' 
  | 'deletion:complete'
  | 'deletion:error'
  | 'deletion:rollback';