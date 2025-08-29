/**
 * WorkflowOrchestrator - Master coordination service for dual-response workflows
 * 
 * Following Essential Boss Rules:
 * - Rule 4: LEGO Bricks - Single responsibility for workflow coordination
 * - Rule 9: Debug with Discipline - Comprehensive error handling with field report learnings
 * - Rule 8: No Hardcoding - Configuration-driven behavior
 */

import type { 
  OrchestratorWorkflow, 
  OrchestratorResult, 
  WorkflowConfig,
  WorkflowStage,
  WorkflowState,
  BrickDependency
} from '../types/OrchestratorTypes';

export class WorkflowOrchestrator {
  private config: WorkflowConfig;
  private activeBricks: Map<string, BrickDependency> = new Map();
  private activeWorkflows: Map<string, OrchestratorWorkflow> = new Map();
  private workflowQueue: OrchestratorWorkflow[] = [];
  private isProcessing: boolean = false;
  
  constructor(config: WorkflowConfig) {
    this.config = config;
  }
  
  /**
   * Register brick dependencies for orchestration
   */
  registerBrick(name: string, instance: any, requiredMethods: string[] = []): void {
    const dependency: BrickDependency = {
      name,
      instance,
      requiredMethods,
      available: this.validateBrickMethods(instance, requiredMethods),
      lastHealthCheck: Date.now(),
      metrics: {
        totalCalls: 0,
        totalTime: 0,
        errors: 0
      }
    };
    
    this.activeBricks.set(name, dependency);
    
    if (this.config.debugMode) {
      console.log(`🔧 WorkflowOrchestrator: Registered brick ${name}`, {
        available: dependency.available,
        requiredMethods
      });
    }
  }
  
  /**
   * Execute complete dual-response workflow
   */
  async executeWorkflow(workflow: OrchestratorWorkflow): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    if (this.config.debugMode) {
      console.log('🚀 WorkflowOrchestrator: Starting workflow', {
        workflowId: workflow.workflowId,
        stage: workflow.stage
      });
    }
    
    // Initialize result structure
    const result: OrchestratorResult = {
      workflowId: workflow.workflowId,
      success: false,
      finalStage: 'initialized',
      stageResults: {},
      outputs: {},
      performance: {
        totalDuration: 0,
        stageBreakdown: {},
        brickPerformance: {},
        throughput: {
          messagesPerSecond: 0,
          responseLatency: 0
        }
      },
      resources: {},
      timestamp: Date.now()
    };
    
    try {
      // Add to active workflows
      this.activeWorkflows.set(workflow.workflowId, workflow);
      
      // Execute workflow stages
      await this.executeWorkflowStages(workflow, result);
      
      // Mark as successful if all required stages completed
      result.success = this.validateWorkflowCompletion(workflow, result);
      result.finalStage = workflow.state.currentStage;
      
    } catch (error) {
      result.success = false;
      result.finalStage = 'failed';
      
      if (this.config.debugMode) {
        console.error('❌ WorkflowOrchestrator: Workflow failed', {
          workflowId: workflow.workflowId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Attempt recovery if enabled
      if (this.config.retries?.maxAttempts && this.config.retries.maxAttempts > 0) {
        await this.attemptWorkflowRecovery(workflow, result, error);
      }
    } finally {
      // Cleanup and finalize
      result.performance.totalDuration = Date.now() - startTime;
      this.activeWorkflows.delete(workflow.workflowId);
      
      if (this.config.debugMode) {
        console.log(`${result.success ? '✅' : '❌'} WorkflowOrchestrator: Workflow ${result.success ? 'completed' : 'failed'}`, {
          workflowId: workflow.workflowId,
          duration: result.performance.totalDuration,
          finalStage: result.finalStage
        });
      }
    }
    
    return result;
  }
  
  /**
   * Execute all workflow stages in sequence
   */
  private async executeWorkflowStages(workflow: OrchestratorWorkflow, result: OrchestratorResult): Promise<void> {
    const stages: WorkflowStage[] = [
      'message_turn_processing',
      'machine_trim_processing',
      'response_routing', 
      'storage_persistence',
      'completion_verification'
    ];
    
    for (const stage of stages) {
      const stageStartTime = Date.now();
      
      try {
        // Update workflow state
        workflow.state.currentStage = stage;
        workflow.state.progressPercentage = this.calculateProgress(workflow.state.completedStages, stages);
        
        // Execute stage
        const stageResult = await this.executeStage(stage, workflow);
        
        // Record stage result
        const stageDuration = Date.now() - stageStartTime;
        result.stageResults[stage] = {
          success: stageResult.success,
          error: stageResult.error,
          data: stageResult.data,
          duration: stageDuration,
          retryCount: stageResult.retryCount || 0
        };
        
        result.performance.stageBreakdown[stage] = stageDuration;
        
        if (stageResult.success) {
          workflow.state.completedStages.push(stage);
          
          // Store stage outputs
          this.storeStageOutputs(stage, stageResult.data, result);
          
        } else {
          // Handle stage failure
          workflow.state.failedStages.push({
            stage,
            error: stageResult.error || 'Unknown error',
            timestamp: Date.now(),
            retryCount: stageResult.retryCount || 0
          });
          
          // Fail fast if stage is critical
          if (this.isCriticalStage(stage)) {
            throw new Error(`Critical stage ${stage} failed: ${stageResult.error}`);
          }
        }
        
      } catch (error) {
        const stageDuration = Date.now() - stageStartTime;
        result.stageResults[stage] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: stageDuration,
          retryCount: 0
        };
        
        throw error;
      }
    }
    
    // Final completion stage
    workflow.state.currentStage = 'completed';
    workflow.state.progressPercentage = 100;
  }
  
  /**
   * Execute individual workflow stage
   */
  private async executeStage(stage: WorkflowStage, workflow: OrchestratorWorkflow): Promise<{
    success: boolean;
    error?: string;
    data?: any;
    retryCount?: number;
  }> {
    let retryCount = 0;
    const maxRetries = this.config.retries?.maxAttempts || 3;
    
    while (retryCount <= maxRetries) {
      try {
        switch (stage) {
          case 'message_turn_processing':
            return await this.executeMessageTurnStage(workflow);
            
          case 'machine_trim_processing':
            return await this.executeMachineTrimStage(workflow);
            
          case 'response_routing':
            return await this.executeResponseRoutingStage(workflow);
            
          case 'storage_persistence':
            return await this.executeStoragePersistenceStage(workflow);
            
          case 'completion_verification':
            return await this.executeCompletionVerificationStage(workflow);
            
          default:
            throw new Error(`Unknown stage: ${stage}`);
        }
        
      } catch (error) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount
          };
        }
        
        // Wait before retry with exponential backoff
        const backoffMs = this.config.retries?.enableExponentialBackoff 
          ? (this.config.retries.backoffMs || 1000) * Math.pow(2, retryCount - 1)
          : (this.config.retries?.backoffMs || 1000);
          
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    return { success: false, error: 'Max retries exceeded', retryCount };
  }
  
  /**
   * Execute message turn processing stage
   */
  private async executeMessageTurnStage(workflow: OrchestratorWorkflow): Promise<{
    success: boolean;
    error?: string;
    data?: any;
  }> {
    const messageTurnBrick = this.activeBricks.get('MessageTurnBrick');
    
    if (!messageTurnBrick?.available) {
      return {
        success: false,
        error: 'MessageTurnBrick not available'
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Execute message turn creation
      const turnResult = await this.callBrickMethod(
        messageTurnBrick,
        'createTurn',
        [workflow.userMessage, workflow.metadata],
        this.config.timeouts?.messageTurn || 30000
      );
      
      // Update workflow state
      workflow.state.stageData.messageTurn = {
        turnId: turnResult.turnId || `turn_${workflow.workflowId}`,
        messageId: turnResult.messageId || `msg_${workflow.workflowId}`,
        status: 'completed'
      };
      
      return {
        success: true,
        data: turnResult
      };
      
    } finally {
      this.updateBrickMetrics(messageTurnBrick, Date.now() - startTime, true);
    }
  }
  
  /**
   * Execute machine trim processing stage
   */
  private async executeMachineTrimStage(workflow: OrchestratorWorkflow): Promise<{
    success: boolean;
    error?: string;
    data?: any;
  }> {
    const machineTrimBrick = this.activeBricks.get('MachineTrimBrick');
    
    if (!machineTrimBrick?.available) {
      return {
        success: false,
        error: 'MachineTrimBrick not available'
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Get turn data from previous stage
      const turnData = workflow.state.stageData.messageTurn;
      if (!turnData?.turnId) {
        throw new Error('No turn data available from previous stage');
      }
      
      // Execute machine trim
      const trimResult = await this.callBrickMethod(
        machineTrimBrick,
        'trimResponse',
        [turnData.turnId, workflow.config],
        this.config.timeouts?.machineTrim || 60000
      );
      
      // Update workflow state
      workflow.state.stageData.machineTrim = {
        trimId: trimResult.trimId || `trim_${workflow.workflowId}`,
        originalLength: trimResult.originalLength || 0,
        trimmedLength: trimResult.trimmedLength || 0,
        status: 'completed'
      };
      
      return {
        success: true,
        data: trimResult
      };
      
    } finally {
      this.updateBrickMetrics(machineTrimBrick, Date.now() - startTime, true);
    }
  }
  
  /**
   * Execute response routing stage
   */
  private async executeResponseRoutingStage(workflow: OrchestratorWorkflow): Promise<{
    success: boolean;
    error?: string;
    data?: any;
  }> {
    const responseRouterBrick = this.activeBricks.get('ResponseRouterBrick');
    
    if (!responseRouterBrick?.available) {
      return {
        success: false,
        error: 'ResponseRouterBrick not available'
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Get trim data from previous stage
      const trimData = workflow.state.stageData.machineTrim;
      if (!trimData?.trimId) {
        throw new Error('No trim data available from previous stage');
      }
      
      // Execute response routing
      const routingResult = await this.callBrickMethod(
        responseRouterBrick,
        'routeResponse',
        [trimData.trimId, workflow.config.storageTargets],
        this.config.timeouts?.responseRouting || 15000
      );
      
      // Update workflow state
      workflow.state.stageData.responseRouting = {
        routingId: routingResult.routingId || `route_${workflow.workflowId}`,
        selectedRoute: routingResult.selectedRoute || 'default',
        status: 'completed'
      };
      
      return {
        success: true,
        data: routingResult
      };
      
    } finally {
      this.updateBrickMetrics(responseRouterBrick, Date.now() - startTime, true);
    }
  }
  
  /**
   * Execute storage persistence stage
   */
  private async executeStoragePersistenceStage(workflow: OrchestratorWorkflow): Promise<{
    success: boolean;
    error?: string;
    data?: any;
  }> {
    const superJournalBrick = this.activeBricks.get('SuperJournalBrick');
    const journalBrick = this.activeBricks.get('JournalBrick');
    
    if (!superJournalBrick?.available || !journalBrick?.available) {
      return {
        success: false,
        error: 'Storage bricks not available'
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Get routing data from previous stage
      const routingData = workflow.state.stageData.responseRouting;
      const turnData = workflow.state.stageData.messageTurn;
      
      if (!routingData?.routingId || !turnData?.turnId) {
        throw new Error('Missing routing or turn data for storage persistence');
      }
      
      // Execute dual storage persistence
      const storageResults = await Promise.all([
        this.callBrickMethod(
          superJournalBrick,
          'saveTurn',
          [turnData.turnId, 'normal_response'],
          this.config.timeouts?.storagePersistence || 30000
        ),
        this.callBrickMethod(
          journalBrick,
          'saveTurn',
          [turnData.turnId, 'machine_trim'],
          this.config.timeouts?.storagePersistence || 30000
        )
      ]);
      
      // Update workflow state
      workflow.state.stageData.storagePersistence = {
        persistenceId: `persist_${workflow.workflowId}`,
        targets: ['SuperJournal', 'Journal'],
        status: 'completed'
      };
      
      return {
        success: true,
        data: {
          superJournalResult: storageResults[0],
          journalResult: storageResults[1]
        }
      };
      
    } finally {
      this.updateBrickMetrics(superJournalBrick, Date.now() - startTime, true);
      this.updateBrickMetrics(journalBrick, Date.now() - startTime, true);
    }
  }
  
  /**
   * Execute completion verification stage
   */
  private async executeCompletionVerificationStage(workflow: OrchestratorWorkflow): Promise<{
    success: boolean;
    error?: string;
    data?: any;
  }> {
    // Verify all previous stages completed successfully
    const requiredStages: WorkflowStage[] = [
      'message_turn_processing',
      'machine_trim_processing', 
      'response_routing',
      'storage_persistence'
    ];
    
    const missingStages = requiredStages.filter(stage => 
      !workflow.state.completedStages.includes(stage)
    );
    
    if (missingStages.length > 0) {
      return {
        success: false,
        error: `Missing required stages: ${missingStages.join(', ')}`
      };
    }
    
    // Verify stage data integrity
    const stageData = workflow.state.stageData;
    if (!stageData.messageTurn?.turnId || 
        !stageData.machineTrim?.trimId || 
        !stageData.responseRouting?.routingId ||
        !stageData.storagePersistence?.persistenceId) {
      return {
        success: false,
        error: 'Stage data integrity check failed'
      };
    }
    
    return {
      success: true,
      data: {
        verified: true,
        completedStages: workflow.state.completedStages.length,
        totalStages: requiredStages.length
      }
    };
  }
  
  /**
   * Call brick method with timeout and error handling
   */
  private async callBrickMethod(
    brick: BrickDependency, 
    method: string, 
    args: any[], 
    timeoutMs: number
  ): Promise<any> {
    if (!brick.instance || typeof brick.instance[method] !== 'function') {
      throw new Error(`Method ${method} not available on ${brick.name}`);
    }
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${method} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    try {
      return await Promise.race([
        brick.instance[method](...args),
        timeoutPromise
      ]);
    } catch (error) {
      brick.metrics.errors++;
      brick.metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }
  
  /**
   * Update brick performance metrics
   */
  private updateBrickMetrics(brick: BrickDependency, duration: number, success: boolean): void {
    brick.metrics.totalCalls++;
    brick.metrics.totalTime += duration;
    if (!success) {
      brick.metrics.errors++;
    }
  }
  
  /**
   * Validate brick has required methods
   */
  private validateBrickMethods(instance: any, requiredMethods: string[]): boolean {
    return requiredMethods.every(method => 
      instance && typeof instance[method] === 'function'
    );
  }
  
  /**
   * Calculate workflow progress percentage
   */
  private calculateProgress(completedStages: WorkflowStage[], totalStages: WorkflowStage[]): number {
    return Math.round((completedStages.length / totalStages.length) * 100);
  }
  
  /**
   * Check if stage is critical for workflow success
   */
  private isCriticalStage(stage: WorkflowStage): boolean {
    const criticalStages: WorkflowStage[] = [
      'message_turn_processing',
      'storage_persistence'
    ];
    return criticalStages.includes(stage);
  }
  
  /**
   * Store stage-specific outputs in result
   */
  private storeStageOutputs(stage: WorkflowStage, data: any, result: OrchestratorResult): void {
    switch (stage) {
      case 'message_turn_processing':
        if (data?.turnId) result.outputs.turnId = data.turnId;
        break;
      case 'machine_trim_processing':
        if (data?.trimmedResponse) result.outputs.trimmedResponse = data.trimmedResponse;
        break;
      case 'response_routing':
        if (data?.routedResponse) result.outputs.routedResponse = data.routedResponse;
        break;
      case 'storage_persistence':
        if (data?.storageReferences) result.outputs.storageReferences = data.storageReferences;
        break;
    }
  }
  
  /**
   * Validate workflow completion
   */
  private validateWorkflowCompletion(workflow: OrchestratorWorkflow, result: OrchestratorResult): boolean {
    const requiredStages: WorkflowStage[] = [
      'message_turn_processing',
      'machine_trim_processing',
      'response_routing',
      'storage_persistence',
      'completion_verification'
    ];
    
    return requiredStages.every(stage => 
      workflow.state.completedStages.includes(stage) &&
      result.stageResults[stage]?.success === true
    );
  }
  
  /**
   * Attempt workflow recovery on failure
   */
  private async attemptWorkflowRecovery(
    workflow: OrchestratorWorkflow, 
    result: OrchestratorResult, 
    error: any
  ): Promise<void> {
    workflow.state.recovery = {
      required: true,
      inProgress: true,
      completedActions: [],
      failedActions: []
    };
    
    try {
      // Recovery logic would go here
      // For now, just mark recovery as attempted
      workflow.state.recovery.completedActions.push('attempted_recovery');
      workflow.state.recovery.inProgress = false;
      
    } catch (recoveryError) {
      workflow.state.recovery.failedActions.push('recovery_failed');
      workflow.state.recovery.inProgress = false;
    }
  }
  
  /**
   * Update orchestrator configuration
   */
  updateConfig(newConfig: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.debugMode) {
      console.log('🔧 WorkflowOrchestrator: Configuration updated', this.config);
    }
  }
  
  /**
   * Get current orchestrator statistics
   */
  getStatistics(): {
    activeWorkflows: number;
    registeredBricks: number;
    brickHealth: Record<string, boolean>;
  } {
    return {
      activeWorkflows: this.activeWorkflows.size,
      registeredBricks: this.activeBricks.size,
      brickHealth: Object.fromEntries(
        Array.from(this.activeBricks.entries()).map(([name, brick]) => [name, brick.available])
      )
    };
  }
}