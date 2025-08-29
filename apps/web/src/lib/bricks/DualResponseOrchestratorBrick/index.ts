/**
 * DualResponseOrchestratorBrick Public API
 * 
 * Export only what other components need to use
 */

export { DualResponseOrchestratorBrick } from './core/DualResponseOrchestratorBrick';
export type { 
  OrchestratorWorkflow, 
  OrchestratorResult, 
  WorkflowConfig,
  WorkflowStage,
  WorkflowState,
  OrchestratorStats,
  OrchestratorEvent,
  BrickDependency,
  WorkflowTemplate
} from './types/OrchestratorTypes';
export { WorkflowOrchestrator } from './services/WorkflowOrchestrator';
export { WorkflowCoordinator } from './services/WorkflowCoordinator';
export { StateManager } from './services/StateManager';
export type {
  UserMessageEvent,
  WorkflowStartedEvent,
  WorkflowStageChangedEvent,
  WorkflowCompletedEvent,
  WorkflowFailedEvent,
  OrchestratorInitializedEvent,
  OrchestratorConfigUpdatedEvent,
  OrchestratorHealthEvent,
  ProcessingStatsEvent,
  DeletionRequestEvent,
  DeletionProcessedEvent,
  SystemPerformanceEvent,
  ErrorReportEvent,
  OrchestratorEventTypes
} from './events/OrchestratorEvents';