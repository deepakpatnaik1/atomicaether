/**
 * SynchronizedDeletionBrick Public API
 * 
 * Export only what other components need to use
 */

export { SynchronizedDeletionBrick } from './core/SynchronizedDeletionBrick';
export type { 
  DeletionRequest, 
  DeletionResult, 
  DeletionConfig, 
  DeletionStats,
  DeletionEvent 
} from './types/DeletionTypes';
export { DeletionOrchestrator } from './services/DeletionOrchestrator';