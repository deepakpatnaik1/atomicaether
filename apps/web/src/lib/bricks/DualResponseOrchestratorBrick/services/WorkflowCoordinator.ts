/**
 * WorkflowCoordinator - Advanced coordination logic for dual-response workflows
 * 
 * Following Essential Boss Rules:
 * - Rule 4: LEGO Bricks - Single responsibility for workflow coordination
 * - Rule 9: Debug with Discipline - Field report learnings applied
 * - Rule 8: No Hardcoding - Configuration-driven coordination behavior
 */

import type { 
  OrchestratorWorkflow, 
  OrchestratorResult,
  WorkflowConfig,
  WorkflowStage
} from '../types/OrchestratorTypes';
import { WorkflowOrchestrator } from './WorkflowOrchestrator';
import { StateManager } from './StateManager';

export class WorkflowCoordinator {
  private orchestrator: WorkflowOrchestrator;
  private stateManager: StateManager;
  private config: WorkflowConfig;
  private eventBus: any = null;
  private isInitialized: boolean = false;
  
  constructor(config: WorkflowConfig) {
    this.config = config;
    this.orchestrator = new WorkflowOrchestrator(config);
    this.stateManager = new StateManager(config.debugMode);
  }
  
  /**
   * Initialize coordinator with bus dependencies
   */
  async initialize(buses: {
    eventBus?: any;
    stateBus?: any;
    configBus?: any;
    errorBus?: any;
  }): Promise<void> {
    this.eventBus = buses.eventBus;
    
    // Set bus dependencies
    if (buses.stateBus) {
      this.stateManager.setStateBus(buses.stateBus);
    }
    
    // Subscribe to events
    if (this.eventBus) {
      this.setupEventSubscriptions();
    }
    
    this.isInitialized = true;
    
    if (this.config.debugMode) {
      console.log('🚀 WorkflowCoordinator: Initialized', {
        eventBus: !!buses.eventBus,
        stateBus: !!buses.stateBus,
        configBus: !!buses.configBus,
        errorBus: !!buses.errorBus
      });
    }
  }
  
  /**
   * Register all required brick dependencies
   */
  registerBricks(bricks: {
    messageTurnBrick?: any;
    machineTrimBrick?: any;
    responseRouterBrick?: any;
    superJournalBrick?: any;
    journalBrick?: any;
    synchronizedDeletionBrick?: any;
  }): void {
    // Register each brick with orchestrator
    if (bricks.messageTurnBrick) {
      this.orchestrator.registerBrick(
        'MessageTurnBrick',
        bricks.messageTurnBrick,
        ['createTurn', 'getTurn', 'updateTurn']
      );
    }
    
    if (bricks.machineTrimBrick) {
      this.orchestrator.registerBrick(
        'MachineTrimBrick',
        bricks.machineTrimBrick,
        ['trimResponse', 'getTrimResult']
      );
    }
    
    if (bricks.responseRouterBrick) {
      this.orchestrator.registerBrick(
        'ResponseRouterBrick',
        bricks.responseRouterBrick,
        ['routeResponse', 'getRoute']
      );
    }
    
    if (bricks.superJournalBrick) {
      this.orchestrator.registerBrick(
        'SuperJournalBrick',
        bricks.superJournalBrick,
        ['saveTurn', 'getTurn', 'deleteTurn']
      );
    }
    
    if (bricks.journalBrick) {
      this.orchestrator.registerBrick(
        'JournalBrick',
        bricks.journalBrick,
        ['saveTurn', 'getTurn', 'deleteTurn']
      );
    }
    
    if (bricks.synchronizedDeletionBrick) {
      this.orchestrator.registerBrick(
        'SynchronizedDeletionBrick',
        bricks.synchronizedDeletionBrick,
        ['deleteTurn', 'getStats']
      );
    }
    
    if (this.config.debugMode) {
      const stats = this.orchestrator.getStatistics();
      console.log('🔧 WorkflowCoordinator: Bricks registered', {
        registeredBricks: Object.keys(bricks).length,
        orchestratorStats: stats,
        brickHealth: stats.brickHealth
      });
      
      // Log any unhealthy bricks
      Object.entries(stats.brickHealth || {}).forEach(([name, healthy]) => {
        if (!healthy) {
          console.warn(`⚠️ WorkflowCoordinator: ${name} is not available - check required methods`);
        }
      });
    }
  }
  
  /**
   * Process user message through complete dual-response workflow
   */
  async processMessage(
    userMessage: string,
    metadata: any = {},
    customConfig?: Partial<WorkflowConfig>
  ): Promise<OrchestratorResult> {
    if (!this.isInitialized) {
      throw new Error('WorkflowCoordinator not initialized. Call initialize() first.');
    }
    
    const workflowId = this.generateWorkflowId();
    const workflowConfig = { ...this.config, ...customConfig };
    
    if (this.config.debugMode) {
      console.log('📩 WorkflowCoordinator: Processing message', {
        workflowId,
        messageLength: userMessage.length,
        metadata
      });
    }
    
    // Create workflow state
    const workflow = this.stateManager.createWorkflow(
      workflowId,
      userMessage,
      workflowConfig,
      metadata
    );
    
    // Publish workflow start event
    this.publishEvent('workflow:started', {
      workflowId,
      userMessage: userMessage.substring(0, 100),
      metadata,
      config: workflowConfig
    });
    
    try {
      // Execute workflow through orchestrator
      const result = await this.orchestrator.executeWorkflow(workflow);
      
      // Update state manager with completion
      this.stateManager.completeWorkflow(workflowId, result.success, result);
      
      // Publish completion event
      this.publishEvent('workflow:completed', {
        workflowId,
        success: result.success,
        finalStage: result.finalStage,
        duration: result.performance.totalDuration,
        outputs: result.outputs
      });
      
      // Update brick utilization metrics
      this.updateBrickMetrics(result);
      
      if (this.config.debugMode) {
        console.log(`${result.success ? '✅' : '❌'} WorkflowCoordinator: Message processed`, {
          workflowId,
          success: result.success,
          duration: result.performance.totalDuration,
          finalStage: result.finalStage
        });
      }
      
      return result;
      
    } catch (error) {
      // Handle workflow failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.stateManager.completeWorkflow(workflowId, false);
      
      this.publishEvent('workflow:failed', {
        workflowId,
        error: errorMessage,
        stage: workflow.state.currentStage
      });
      
      if (this.config.debugMode) {
        console.error('❌ WorkflowCoordinator: Message processing failed', {
          workflowId,
          error: errorMessage,
          stage: workflow.state.currentStage
        });
      }
      
      throw error;
    } finally {
      // Cleanup workflow from memory after delay
      setTimeout(() => {
        this.stateManager.removeWorkflow(workflowId);
      }, 30000); // 30 second cleanup delay
    }
  }
  
  /**
   * Process deletion request through workflow
   */
  async processDeletion(
    turnId: string,
    requestedBy: string = 'system',
    reason: string = 'user_requested'
  ): Promise<{ success: boolean; deletionId: string; error?: string }> {
    if (!this.isInitialized) {
      throw new Error('WorkflowCoordinator not initialized');
    }
    
    const deletionId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.config.debugMode) {
      console.log('🗑️ WorkflowCoordinator: Processing deletion', {
        deletionId,
        turnId,
        requestedBy
      });
    }
    
    try {
      // Publish deletion request event
      this.publishEvent('turn:delete:request', {
        deletionId,
        turnId,
        requestedBy,
        reason,
        timestamp: Date.now()
      });
      
      return {
        success: true,
        deletionId
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (this.config.debugMode) {
        console.error('❌ WorkflowCoordinator: Deletion failed', {
          deletionId,
          turnId,
          error: errorMessage
        });
      }
      
      return {
        success: false,
        deletionId,
        error: errorMessage
      };
    }
  }
  
  /**
   * Get current workflow statistics
   */
  getStatistics(): {
    orchestrator: any;
    stateManager: any;
    coordinator: {
      isInitialized: boolean;
      config: WorkflowConfig;
      healthScore: number;
    };
  } {
    const stateStats = this.stateManager.getStatistics();
    const healthReport = this.stateManager.getHealthReport();
    
    return {
      orchestrator: this.orchestrator.getStatistics(),
      stateManager: stateStats,
      coordinator: {
        isInitialized: this.isInitialized,
        config: this.config,
        healthScore: healthReport.healthy ? 100 : Math.max(0, 100 - (healthReport.issues.length * 20))
      }
    };
  }
  
  /**
   * Get active workflows
   */
  getActiveWorkflows(): OrchestratorWorkflow[] {
    return this.stateManager.getActiveWorkflows();
  }
  
  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): OrchestratorWorkflow | undefined {
    return this.stateManager.getWorkflow(workflowId);
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.orchestrator.updateConfig(this.config);
    
    if (this.config.debugMode) {
      console.log('🔧 WorkflowCoordinator: Configuration updated', this.config);
    }
    
    this.publishEvent('config:updated', { config: this.config });
  }
  
  /**
   * Health check for coordinator
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: Record<string, boolean>;
    issues: string[];
    timestamp: number;
  }> {
    const healthReport = this.stateManager.getHealthReport();
    const orchestratorStats = this.orchestrator.getStatistics();
    
    const components = {
      initialized: this.isInitialized,
      stateManager: healthReport.healthy,
      orchestrator: orchestratorStats.registeredBricks > 0,
      eventBus: !!this.eventBus
    };
    
    const allHealthy = Object.values(components).every(healthy => healthy);
    
    return {
      healthy: allHealthy && healthReport.healthy,
      components,
      issues: [
        ...healthReport.issues,
        ...(this.isInitialized ? [] : ['Coordinator not initialized']),
        ...(this.eventBus ? [] : ['EventBus not connected'])
      ],
      timestamp: Date.now()
    };
  }
  
  /**
   * Setup event subscriptions
   */
  private setupEventSubscriptions(): void {
    if (!this.eventBus) return;
    
    // Subscribe to user message events
    if (typeof this.eventBus.subscribe === 'function') {
      this.eventBus.subscribe('user:message', this.handleUserMessage.bind(this));
      this.eventBus.subscribe('turn:delete:request', this.handleDeletionRequest.bind(this));
      this.eventBus.subscribe('config:update', this.handleConfigUpdate.bind(this));
    }
    
    if (this.config.debugMode) {
      console.log('📡 WorkflowCoordinator: Event subscriptions setup');
    }
  }
  
  /**
   * Handle user message event
   */
  private async handleUserMessage(event: any): Promise<void> {
    try {
      await this.processMessage(event.message, event.metadata);
    } catch (error) {
      if (this.config.debugMode) {
        console.error('❌ WorkflowCoordinator: Error handling user message', error);
      }
    }
  }
  
  /**
   * Handle deletion request event
   */
  private async handleDeletionRequest(event: any): Promise<void> {
    try {
      await this.processDeletion(event.turnId, event.requestedBy, event.reason);
    } catch (error) {
      if (this.config.debugMode) {
        console.error('❌ WorkflowCoordinator: Error handling deletion request', error);
      }
    }
  }
  
  /**
   * Handle configuration update event
   */
  private handleConfigUpdate(event: any): void {
    if (event.config) {
      this.updateConfig(event.config);
    }
  }
  
  /**
   * Publish event to EventBus
   */
  private publishEvent(eventType: string, data: any): void {
    if (this.eventBus && typeof this.eventBus.publish === 'function') {
      this.eventBus.publish(eventType, {
        ...data,
        timestamp: Date.now(),
        source: 'WorkflowCoordinator'
      });
    }
  }
  
  /**
   * Update brick performance metrics
   */
  private updateBrickMetrics(result: OrchestratorResult): void {
    Object.entries(result.performance.brickPerformance).forEach(([brickName, metrics]) => {
      this.stateManager.updateBrickUtilization(
        brickName,
        metrics.averageTime,
        metrics.errors === 0
      );
    });
  }
  
  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Cleanup resources and stop coordinator
   */
  async shutdown(): Promise<void> {
    if (this.config.debugMode) {
      console.log('🛑 WorkflowCoordinator: Shutting down');
    }
    
    // Complete any active workflows
    const activeWorkflows = this.stateManager.getActiveWorkflows();
    await Promise.all(
      activeWorkflows.map(workflow => 
        this.stateManager.completeWorkflow(workflow.workflowId, false)
      )
    );
    
    // Reset state
    this.stateManager.resetStatistics();
    this.isInitialized = false;
    
    this.publishEvent('coordinator:shutdown', { timestamp: Date.now() });
    
    if (this.config.debugMode) {
      console.log('✅ WorkflowCoordinator: Shutdown complete');
    }
  }
}