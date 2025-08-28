/**
 * ResponseRouterBrick Type Definitions
 * Types for automatic routing of dual responses to appropriate storage destinations
 */

import type { DualResponse } from '$lib/bricks/DualResponseBrick/types/DualResponseTypes';
import type { JournalEntry } from '$lib/bricks/JournalBrick/types/JournalTypes';

export interface RoutingConfig {
  routingTargets: {
    normalResponse: 'SuperJournalBrick' | 'disabled';
    machineTrim: 'JournalBrick' | 'disabled';
  };
  atomicOperations: boolean;
  rollbackOnFailure: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  enableRouting: boolean;
  debugMode: boolean;
}

export interface RoutingMetadata {
  turnId: string;
  persona: string;
  model: string;
  timestamp: number;
  routingId: string;
}

export interface RoutingOperation {
  id: string;
  target: 'SuperJournalBrick' | 'JournalBrick';
  type: 'store' | 'rollback';
  data: any;
  metadata: RoutingMetadata;
  operation: () => Promise<RoutingOperationResult>;
  rollback?: () => Promise<RoutingOperationResult>;
  completed: boolean;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface RoutingOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface AtomicRoutingResult {
  success: boolean;
  routingId: string;
  operations_attempted: RoutingOperation[];
  operations_completed: RoutingOperation[];
  operations_failed: RoutingOperation[];
  rollback_required: boolean;
  rollback_completed: boolean;
  total_time_ms: number;
  error?: string;
  timestamp: number;
}

export interface RoutingRequest {
  dualResponse: DualResponse;
  metadata: RoutingMetadata;
  timestamp: number;
}

export interface RoutingEvent {
  type: 'routing:started' | 'routing:complete' | 'routing:error' | 'routing:rollback';
  data: {
    routingId: string;
    success: boolean;
    operations_count?: number;
    rollback_required?: boolean;
    error?: string;
    performance?: {
      total_time_ms: number;
      operations_time_ms: number;
      rollback_time_ms?: number;
    };
    timestamp: number;
  };
}

export interface RoutingStats {
  total_routings: number;
  successful_routings: number;
  failed_routings: number;
  rollbacks_required: number;
  rollbacks_completed: number;
  average_routing_time_ms: number;
  last_routing_timestamp: number;
}

// Integration types for existing bricks
export interface SuperJournalStoreOperation {
  content: string;
  metadata: {
    turnId: string;
    persona: string;
    model: string;
    timestamp: number;
  };
}

export interface JournalStoreOperation {
  machineTrim: JournalEntry;
  metadata: {
    turnId: string;
    persona: string;
    model: string;
    timestamp: number;
  };
}