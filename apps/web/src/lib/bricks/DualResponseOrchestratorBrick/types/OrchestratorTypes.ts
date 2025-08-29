/**
 * TypeScript interfaces for DualResponseOrchestratorBrick
 * 
 * Following Essential Boss Rules:
 * - Rule 8: No Hardcoding - All configuration externalized
 * - Rule 4: LEGO Bricks - Clear interface definitions
 */

export interface OrchestratorWorkflow {
  /** Unique identifier for the workflow */
  workflowId: string;
  
  /** User message that initiated the workflow */
  userMessage: string;
  
  /** Current workflow stage */
  stage: WorkflowStage;
  
  /** Workflow configuration */
  config: WorkflowConfig;
  
  /** Metadata about the workflow */
  metadata: {
    userId?: string;
    sessionId?: string;
    priority?: 'low' | 'normal' | 'high';
    startTime: number;
    estimatedDuration?: number;
  };
  
  /** Workflow state tracking */
  state: WorkflowState;
  
  /** Performance metrics */
  performance: {
    stageTimings: Record<string, number>;
    totalProcessingTime?: number;
    brickLatencies: Record<string, number>;
  };
  
  /** Timestamp */
  timestamp: number;
}

export interface WorkflowConfig {
  /** Enable dual response processing */
  enableDualResponse?: boolean;
  
  /** Enable machine trim processing */
  enableMachineTrim?: boolean;
  
  /** Enable response routing */
  enableResponseRouting?: boolean;
  
  /** Enable synchronized deletion */
  enableSynchronizedDeletion?: boolean;
  
  /** Target storage systems */
  storageTargets?: {
    primary: string;
    secondary: string;
  };
  
  /** Processing timeouts */
  timeouts?: {
    messageTurn: number;
    machineTrim: number;
    responseRouting: number;
    storagePersistence: number;
    deletion: number;
  };
  
  /** Retry configuration */
  retries?: {
    maxAttempts: number;
    backoffMs: number;
    enableExponentialBackoff: boolean;
  };
  
  /** Monitoring configuration */
  monitoring?: {
    enablePerformanceTracking: boolean;
    enableDetailedLogging: boolean;
    enableErrorReporting: boolean;
  };
  
  /** Enable debug mode */
  debugMode?: boolean;
}

export type WorkflowStage = 
  | 'initialized'
  | 'message_turn_processing'
  | 'machine_trim_processing'  
  | 'response_routing'
  | 'storage_persistence'
  | 'completion_verification'
  | 'completed'
  | 'failed'
  | 'cleanup';

export interface WorkflowState {
  /** Current processing stage */
  currentStage: WorkflowStage;
  
  /** Completed stages */
  completedStages: WorkflowStage[];
  
  /** Failed stages with error details */
  failedStages: Array<{
    stage: WorkflowStage;
    error: string;
    timestamp: number;
    retryCount: number;
  }>;
  
  /** Stage-specific data */
  stageData: {
    messageTurn?: {
      turnId: string;
      messageId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    };
    machineTrim?: {
      trimId: string;
      originalLength: number;
      trimmedLength: number;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    };
    responseRouting?: {
      routingId: string;
      selectedRoute: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    };
    storagePersistence?: {
      persistenceId: string;
      targets: string[];
      status: 'pending' | 'processing' | 'completed' | 'failed';
    };
  };
  
  /** Overall workflow progress (0-100) */
  progressPercentage: number;
  
  /** Error recovery state */
  recovery?: {
    required: boolean;
    inProgress: boolean;
    completedActions: string[];
    failedActions: string[];
  };
}

export interface OrchestratorResult {
  /** Unique identifier for the workflow */
  workflowId: string;
  
  /** Overall success status */
  success: boolean;
  
  /** Final workflow stage */
  finalStage: WorkflowStage;
  
  /** Stage-by-stage results */
  stageResults: Record<WorkflowStage, {
    success: boolean;
    error?: string;
    data?: any;
    duration: number;
    retryCount: number;
  }>;
  
  /** Generated outputs */
  outputs: {
    turnId?: string;
    trimmedResponse?: string;
    routedResponse?: string;
    storageReferences?: string[];
  };
  
  /** Performance metrics */
  performance: {
    totalDuration: number;
    stageBreakdown: Record<WorkflowStage, number>;
    brickPerformance: Record<string, {
      calls: number;
      totalTime: number;
      averageTime: number;
      errors: number;
    }>;
    throughput: {
      messagesPerSecond: number;
      responseLatency: number;
    };
  };
  
  /** Resource utilization */
  resources: {
    memoryUsage?: number;
    cpuTime?: number;
    storageOperations?: number;
    networkCalls?: number;
  };
  
  /** Result timestamp */
  timestamp: number;
}

export interface OrchestratorStats {
  /** Total workflows processed */
  totalWorkflows: number;
  
  /** Successful workflows */
  successfulWorkflows: number;
  
  /** Failed workflows */
  failedWorkflows: number;
  
  /** Workflows currently in progress */
  activeWorkflows: number;
  
  /** Average processing time */
  averageProcessingTime: number;
  
  /** Stage success rates */
  stageSuccessRates: Record<WorkflowStage, {
    attempts: number;
    successes: number;
    failures: number;
    averageTime: number;
  }>;
  
  /** Brick utilization */
  brickUtilization: Record<string, {
    totalCalls: number;
    totalTime: number;
    errorRate: number;
    availability: number;
  }>;
  
  /** System health */
  systemHealth: {
    overallScore: number;
    throughput: number;
    errorRate: number;
    responseTime: number;
    resourceUtilization: number;
  };
  
  /** Statistics timestamp */
  lastUpdated: number;
}

export interface OrchestratorEvent {
  type: 'workflow:started' | 'workflow:stage:changed' | 'workflow:completed' | 'workflow:failed' | 'workflow:recovery';
  data: {
    workflowId: string;
    stage?: WorkflowStage;
    previousStage?: WorkflowStage;
    success?: boolean;
    error?: string;
    duration?: number;
    progress?: number;
    stageData?: any;
    recovery?: {
      required: boolean;
      actions: string[];
    };
    timestamp: number;
  };
}

export interface BrickDependency {
  /** Name of the brick */
  name: string;
  
  /** Brick instance reference */
  instance: any;
  
  /** Required methods that must be available */
  requiredMethods: string[];
  
  /** Current availability status */
  available: boolean;
  
  /** Last health check timestamp */
  lastHealthCheck: number;
  
  /** Performance metrics for this brick */
  metrics: {
    totalCalls: number;
    totalTime: number;
    errors: number;
    lastError?: string;
  };
}

export interface WorkflowTemplate {
  /** Template identifier */
  templateId: string;
  
  /** Template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Default configuration */
  defaultConfig: WorkflowConfig;
  
  /** Required brick dependencies */
  requiredBricks: string[];
  
  /** Stage definitions */
  stages: {
    stage: WorkflowStage;
    required: boolean;
    dependencies: string[];
    timeout: number;
    retryable: boolean;
  }[];
  
  /** Template version */
  version: string;
}