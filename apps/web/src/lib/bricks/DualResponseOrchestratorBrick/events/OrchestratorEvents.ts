/**
 * Orchestrator Event Type Definitions
 * 
 * Following Rule 2 (Four Buses) - Standard event definitions for EventBus
 */

export interface UserMessageEvent {
  message: string;
  userId?: string;
  sessionId?: string;
  priority?: 'low' | 'normal' | 'high';
  metadata?: any;
  timestamp: number;
}

export interface WorkflowStartedEvent {
  workflowId: string;
  userMessage: string;
  metadata: any;
  config: any;
  estimatedDuration?: number;
  timestamp: number;
}

export interface WorkflowStageChangedEvent {
  workflowId: string;
  previousStage: string;
  newStage: string;
  progress: number;
  stageData?: any;
  duration?: number;
  timestamp: number;
}

export interface WorkflowCompletedEvent {
  workflowId: string;
  success: true;
  finalStage: string;
  duration: number;
  outputs: {
    turnId?: string;
    trimmedResponse?: string;
    routedResponse?: string;
    storageReferences?: string[];
  };
  performance: {
    totalDuration: number;
    stageBreakdown: Record<string, number>;
    brickPerformance: Record<string, any>;
  };
  timestamp: number;
}

export interface WorkflowFailedEvent {
  workflowId: string;
  success: false;
  error: string;
  stage: string;
  failedStages?: Array<{
    stage: string;
    error: string;
    timestamp: number;
  }>;
  recovery?: {
    attempted: boolean;
    successful: boolean;
    actions: string[];
  };
  timestamp: number;
}

export interface OrchestratorInitializedEvent {
  config: any;
  registeredBricks: string[];
  busConnections: {
    eventBus: boolean;
    configBus: boolean;
    stateBus: boolean;
    errorBus: boolean;
  };
  timestamp: number;
}

export interface OrchestratorConfigUpdatedEvent {
  config: any;
  updatedFields: string[];
  source: 'external_file' | 'runtime_update' | 'config_bus';
  timestamp: number;
}

export interface OrchestratorHealthEvent {
  healthy: boolean;
  components: {
    brick: boolean;
    coordinator: boolean;
    bricks: Record<string, boolean>;
  };
  issues: string[];
  metrics: {
    activeWorkflows: number;
    systemHealth: number;
    errorRate: number;
    throughput: number;
  };
  timestamp: number;
}

export interface BrickRegistrationEvent {
  brickName: string;
  available: boolean;
  requiredMethods: string[];
  health: {
    totalCalls: number;
    totalTime: number;
    errors: number;
    availability: number;
  };
  timestamp: number;
}

export interface ProcessingStatsEvent {
  totalWorkflows: number;
  successfulWorkflows: number;
  failedWorkflows: number;
  activeWorkflows: number;
  averageProcessingTime: number;
  stageSuccessRates: Record<string, {
    attempts: number;
    successes: number;
    failures: number;
    averageTime: number;
  }>;
  brickUtilization: Record<string, {
    totalCalls: number;
    totalTime: number;
    errorRate: number;
    availability: number;
  }>;
  systemHealth: {
    overallScore: number;
    throughput: number;
    errorRate: number;
    responseTime: number;
  };
  timestamp: number;
}

export interface DeletionRequestEvent {
  deletionId: string;
  turnId: string;
  requestedBy: string;
  reason?: string;
  priority?: 'low' | 'normal' | 'high';
  timestamp: number;
}

export interface DeletionProcessedEvent {
  deletionId: string;
  turnId: string;
  success: boolean;
  error?: string;
  duration?: number;
  operations?: Array<{
    target: string;
    success: boolean;
    error?: string;
  }>;
  timestamp: number;
}

export interface SystemPerformanceEvent {
  type: 'performance_snapshot';
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  workflows: {
    total: number;
    active: number;
    queued: number;
    completed: number;
    failed: number;
  };
  bricks: {
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
  };
  timestamp: number;
}

export interface ErrorReportEvent {
  type: 'error_report';
  category: 'workflow' | 'brick' | 'system' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
  context: {
    workflowId?: string;
    brickName?: string;
    stage?: string;
    operation?: string;
  };
  impact: {
    workflowsAffected: number;
    systemAvailability: number;
    dataIntegrity: boolean;
  };
  timestamp: number;
}

// Event type union for type safety
export type OrchestratorEventTypes = 
  | 'user:message'
  | 'workflow:started' 
  | 'workflow:stage:changed'
  | 'workflow:completed'
  | 'workflow:failed'
  | 'orchestrator:initialized'
  | 'orchestrator:config:updated'
  | 'orchestrator:config:reloaded'
  | 'orchestrator:health'
  | 'orchestrator:destroyed'
  | 'brick:registered'
  | 'brick:unregistered'
  | 'processing:stats'
  | 'turn:delete:request'
  | 'deletion:processed'
  | 'system:performance'
  | 'system:error';