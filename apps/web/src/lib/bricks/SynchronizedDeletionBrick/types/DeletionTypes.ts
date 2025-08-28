/**
 * TypeScript interfaces for SynchronizedDeletionBrick
 * 
 * Following Essential Boss Rules:
 * - Rule 8: No Hardcoding - All configuration externalized
 * - Rule 4: LEGO Bricks - Clear interface definitions
 */

export interface DeletionRequest {
  /** Unique identifier for the deletion operation */
  deletionId: string;
  
  /** Turn ID to delete from both storage systems */
  turnId: string;
  
  /** Metadata about the deletion request */
  metadata: {
    requestedBy: string;
    reason?: string;
    timestamp: number;
    priority?: 'low' | 'normal' | 'high';
  };
  
  /** Request timestamp */
  timestamp: number;
}

export interface DeletionConfig {
  /** Enable synchronized deletion across dual storage */
  enableSynchronizedDeletion?: boolean;
  
  /** Use atomic operations for deletion */
  atomicOperations?: boolean;
  
  /** Rollback on partial failures */
  rollbackOnFailure?: boolean;
  
  /** Maximum retry attempts for failed operations */
  maxRetries?: number;
  
  /** Delay between retry attempts in milliseconds */
  retryDelayMs?: number;
  
  /** Timeout for each deletion operation in milliseconds */
  timeoutMs?: number;
  
  /** Target storage systems for deletion */
  deletionTargets?: {
    normalResponse: string;
    machineTrim: string;
  };
  
  /** Enable debug logging */
  debugMode?: boolean;
}

export interface DeletionResult {
  /** Unique identifier for the deletion operation */
  deletionId: string;
  
  /** Turn ID that was deleted */
  turnId: string;
  
  /** Overall success status */
  success: boolean;
  
  /** Individual operation results */
  operations: {
    normalResponse: {
      success: boolean;
      error?: string;
      timestamp: number;
    };
    machineTrim: {
      success: boolean;
      error?: string;
      timestamp: number;
    };
  };
  
  /** Rollback information if applicable */
  rollback?: {
    required: boolean;
    completed: boolean;
    operations: string[];
    error?: string;
  };
  
  /** Performance metrics */
  performance: {
    totalTimeMs: number;
    operationsTimeMs: number;
    retryCount: number;
  };
  
  /** Result timestamp */
  timestamp: number;
}

export interface DeletionStats {
  /** Total deletion operations attempted */
  totalDeletions: number;
  
  /** Successful deletions */
  successfulDeletions: number;
  
  /** Failed deletions */
  failedDeletions: number;
  
  /** Rollbacks required */
  rollbacksRequired: number;
  
  /** Rollbacks completed successfully */
  rollbacksCompleted: number;
  
  /** Average deletion time in milliseconds */
  averageDeletionTimeMs: number;
  
  /** Last deletion timestamp */
  lastDeletionTimestamp: number;
}

export interface DeletionEvent {
  type: 'deletion:started' | 'deletion:complete' | 'deletion:error' | 'deletion:rollback';
  data: {
    deletionId: string;
    turnId?: string;
    success?: boolean;
    error?: string;
    operationsCount?: number;
    performance?: {
      totalTimeMs: number;
      operationsTimeMs: number;
      retryCount: number;
    };
    rollback?: {
      required: boolean;
      completed: boolean;
      operations: string[];
    };
    timestamp: number;
  };
}