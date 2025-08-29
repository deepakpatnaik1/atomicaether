/**
 * StateManager - Comprehensive state management for dual-response orchestration
 * 
 * Following Essential Boss Rules:
 * - Rule 4: LEGO Bricks - Single responsibility for state management
 * - Rule 2: Four Buses - StateBus integration for centralized state
 * - Rule 8: No Hardcoding - Configuration-driven state behavior
 */

import type { 
  OrchestratorWorkflow, 
  WorkflowState,
  WorkflowStage,
  OrchestratorStats
} from '../types/OrchestratorTypes';

export class StateManager {
  private workflows: Map<string, OrchestratorWorkflow> = new Map();
  private stats: OrchestratorStats;
  private stateBus: any = null;
  private debugMode: boolean = false;
  
  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.initializeStats();
  }
  
  /**
   * Set StateBus dependency for centralized state management
   */
  setStateBus(stateBus: any): void {
    this.stateBus = stateBus;
    
    if (this.debugMode) {
      console.log('🔧 StateManager: StateBus configured', {
        stateBusAvailable: !!stateBus
      });
    }
  }
  
  /**
   * Initialize orchestrator statistics
   */
  private initializeStats(): void {
    this.stats = {
      totalWorkflows: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      activeWorkflows: 0,
      averageProcessingTime: 0,
      stageSuccessRates: {
        'initialized': { attempts: 0, successes: 0, failures: 0, averageTime: 0 },
        'message_turn_processing': { attempts: 0, successes: 0, failures: 0, averageTime: 0 },
        'machine_trim_processing': { attempts: 0, successes: 0, failures: 0, averageTime: 0 },
        'response_routing': { attempts: 0, successes: 0, failures: 0, averageTime: 0 },
        'storage_persistence': { attempts: 0, successes: 0, failures: 0, averageTime: 0 },
        'completion_verification': { attempts: 0, successes: 0, failures: 0, averageTime: 0 },
        'completed': { attempts: 0, successes: 0, failures: 0, averageTime: 0 },
        'failed': { attempts: 0, successes: 0, failures: 0, averageTime: 0 },
        'cleanup': { attempts: 0, successes: 0, failures: 0, averageTime: 0 }
      },
      brickUtilization: {},
      systemHealth: {
        overallScore: 100,
        throughput: 0,
        errorRate: 0,
        responseTime: 0,
        resourceUtilization: 0
      },
      lastUpdated: Date.now()
    };
  }
  
  /**
   * Create new workflow state
   */
  createWorkflow(workflowId: string, userMessage: string, config: any, metadata: any): OrchestratorWorkflow {
    const workflow: OrchestratorWorkflow = {
      workflowId,
      userMessage,
      stage: 'initialized',
      config,
      metadata: {
        ...metadata,
        startTime: Date.now()
      },
      state: {
        currentStage: 'initialized',
        completedStages: [],
        failedStages: [],
        stageData: {},
        progressPercentage: 0
      },
      performance: {
        stageTimings: {},
        brickLatencies: {}
      },
      timestamp: Date.now()
    };
    
    // Store workflow
    this.workflows.set(workflowId, workflow);
    
    // Update statistics
    this.stats.totalWorkflows++;
    this.stats.activeWorkflows++;
    this.updateStatistics();
    
    // Publish to StateBus
    this.publishStateChange('workflow:created', workflow);
    
    if (this.debugMode) {
      console.log('🆕 StateManager: Workflow created', {
        workflowId,
        totalActive: this.stats.activeWorkflows
      });
    }
    
    return workflow;
  }
  
  /**
   * Update workflow stage
   */
  updateWorkflowStage(
    workflowId: string, 
    newStage: WorkflowStage, 
    stageData?: any,
    performance?: { duration: number; success: boolean }
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      if (this.debugMode) {
        console.warn('⚠️ StateManager: Workflow not found for stage update', { workflowId });
      }
      return false;
    }
    
    const previousStage = workflow.state.currentStage;
    
    // Update stage
    workflow.state.currentStage = newStage;
    
    // Record stage completion if successful
    if (performance?.success && !workflow.state.completedStages.includes(previousStage)) {
      workflow.state.completedStages.push(previousStage);
    }
    
    // Record stage failure if unsuccessful
    if (performance && !performance.success) {
      workflow.state.failedStages.push({
        stage: previousStage,
        error: 'Stage execution failed',
        timestamp: Date.now(),
        retryCount: 0
      });
    }
    
    // Update stage data
    if (stageData) {
      workflow.state.stageData = { ...workflow.state.stageData, ...stageData };
    }
    
    // Update performance metrics
    if (performance) {
      workflow.performance.stageTimings[previousStage] = performance.duration;
      
      // Update stage success rates
      this.updateStageStats(previousStage, performance.duration, performance.success);
    }
    
    // Calculate progress
    workflow.state.progressPercentage = this.calculateWorkflowProgress(workflow);
    
    // Publish state change
    this.publishStateChange('workflow:stage:changed', {
      workflowId,
      previousStage,
      newStage,
      progress: workflow.state.progressPercentage,
      stageData
    });
    
    if (this.debugMode) {
      console.log(`🔄 StateManager: Stage updated ${previousStage} → ${newStage}`, {
        workflowId,
        progress: workflow.state.progressPercentage
      });
    }
    
    return true;
  }
  
  /**
   * Complete workflow
   */
  completeWorkflow(workflowId: string, success: boolean, result?: any): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }
    
    // Update final stage
    workflow.stage = success ? 'completed' : 'failed';
    workflow.state.currentStage = success ? 'completed' : 'failed';
    workflow.state.progressPercentage = success ? 100 : workflow.state.progressPercentage;
    
    // Calculate total processing time
    const totalTime = Date.now() - workflow.metadata.startTime;
    workflow.performance.totalProcessingTime = totalTime;
    
    // Update statistics
    if (success) {
      this.stats.successfulWorkflows++;
    } else {
      this.stats.failedWorkflows++;
    }
    this.stats.activeWorkflows--;
    
    // Update average processing time
    this.stats.averageProcessingTime = this.calculateAverageProcessingTime();
    this.updateStatistics();
    
    // Publish completion
    this.publishStateChange('workflow:completed', {
      workflowId,
      success,
      totalTime,
      finalStage: workflow.stage,
      result
    });
    
    if (this.debugMode) {
      console.log(`${success ? '✅' : '❌'} StateManager: Workflow completed`, {
        workflowId,
        success,
        totalTime,
        activeWorkflows: this.stats.activeWorkflows
      });
    }
    
    return true;
  }
  
  /**
   * Remove workflow from active state
   */
  removeWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }
    
    // Ensure workflow is marked as completed first
    if (workflow.state.currentStage !== 'completed' && workflow.state.currentStage !== 'failed') {
      this.completeWorkflow(workflowId, false);
    }
    
    // Remove from active workflows
    const removed = this.workflows.delete(workflowId);
    
    if (removed) {
      this.publishStateChange('workflow:removed', { workflowId });
      
      if (this.debugMode) {
        console.log('🗑️ StateManager: Workflow removed', {
          workflowId,
          remainingWorkflows: this.workflows.size
        });
      }
    }
    
    return removed;
  }
  
  /**
   * Get workflow state
   */
  getWorkflow(workflowId: string): OrchestratorWorkflow | undefined {
    return this.workflows.get(workflowId);
  }
  
  /**
   * Get all active workflows
   */
  getActiveWorkflows(): OrchestratorWorkflow[] {
    return Array.from(this.workflows.values()).filter(
      workflow => workflow.state.currentStage !== 'completed' && workflow.state.currentStage !== 'failed'
    );
  }
  
  /**
   * Get workflows by stage
   */
  getWorkflowsByStage(stage: WorkflowStage): OrchestratorWorkflow[] {
    return Array.from(this.workflows.values()).filter(
      workflow => workflow.state.currentStage === stage
    );
  }
  
  /**
   * Get current statistics
   */
  getStatistics(): OrchestratorStats {
    return { ...this.stats };
  }
  
  /**
   * Update brick utilization metrics
   */
  updateBrickUtilization(brickName: string, callTime: number, success: boolean): void {
    if (!this.stats.brickUtilization[brickName]) {
      this.stats.brickUtilization[brickName] = {
        totalCalls: 0,
        totalTime: 0,
        errorRate: 0,
        availability: 100
      };
    }
    
    const brick = this.stats.brickUtilization[brickName];
    brick.totalCalls++;
    brick.totalTime += callTime;
    
    if (!success) {
      const errorCount = brick.totalCalls * (brick.errorRate / 100) + 1;
      brick.errorRate = (errorCount / brick.totalCalls) * 100;
    } else {
      const errorCount = brick.totalCalls * (brick.errorRate / 100);
      brick.errorRate = (errorCount / brick.totalCalls) * 100;
    }
    
    // Update availability (simplified calculation)
    brick.availability = Math.max(0, 100 - brick.errorRate);
    
    this.updateSystemHealth();
  }
  
  /**
   * Calculate workflow progress percentage
   */
  private calculateWorkflowProgress(workflow: OrchestratorWorkflow): number {
    const totalStages = 7; // Total possible stages in workflow
    const completedStages = workflow.state.completedStages.length;
    return Math.round((completedStages / totalStages) * 100);
  }
  
  /**
   * Update stage statistics
   */
  private updateStageStats(stage: WorkflowStage, duration: number, success: boolean): void {
    const stageStats = this.stats.stageSuccessRates[stage];
    if (!stageStats) return;
    
    stageStats.attempts++;
    
    if (success) {
      stageStats.successes++;
    } else {
      stageStats.failures++;
    }
    
    // Update average time
    const totalTime = stageStats.averageTime * (stageStats.attempts - 1) + duration;
    stageStats.averageTime = totalTime / stageStats.attempts;
  }
  
  /**
   * Calculate average processing time across all workflows
   */
  private calculateAverageProcessingTime(): number {
    const completedWorkflows = Array.from(this.workflows.values()).filter(
      workflow => workflow.performance.totalProcessingTime !== undefined
    );
    
    if (completedWorkflows.length === 0) return 0;
    
    const totalTime = completedWorkflows.reduce(
      (sum, workflow) => sum + (workflow.performance.totalProcessingTime || 0), 
      0
    );
    
    return Math.round(totalTime / completedWorkflows.length);
  }
  
  /**
   * Update system health metrics
   */
  private updateSystemHealth(): void {
    const bricks = Object.values(this.stats.brickUtilization);
    
    if (bricks.length === 0) {
      this.stats.systemHealth.overallScore = 100;
      return;
    }
    
    // Calculate overall health score
    const avgAvailability = bricks.reduce((sum, brick) => sum + brick.availability, 0) / bricks.length;
    const avgErrorRate = bricks.reduce((sum, brick) => sum + brick.errorRate, 0) / bricks.length;
    
    this.stats.systemHealth.overallScore = Math.round(avgAvailability);
    this.stats.systemHealth.errorRate = Math.round(avgErrorRate * 100) / 100;
    this.stats.systemHealth.responseTime = this.stats.averageProcessingTime;
    
    // Calculate throughput (workflows per minute)
    const activeTime = Date.now() - (this.stats.lastUpdated - 60000); // Last minute
    this.stats.systemHealth.throughput = Math.round(
      (this.stats.totalWorkflows / Math.max(1, activeTime / 60000)) * 100
    ) / 100;
  }
  
  /**
   * Update general statistics
   */
  private updateStatistics(): void {
    this.stats.lastUpdated = Date.now();
    this.updateSystemHealth();
  }
  
  /**
   * Publish state changes to StateBus
   */
  private publishStateChange(eventType: string, data: any): void {
    if (this.stateBus && typeof this.stateBus.publish === 'function') {
      this.stateBus.publish('orchestrator:state', {
        type: eventType,
        data,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Reset all statistics (for testing/debugging)
   */
  resetStatistics(): void {
    this.initializeStats();
    
    if (this.debugMode) {
      console.log('🔄 StateManager: Statistics reset');
    }
  }
  
  /**
   * Get state health report
   */
  getHealthReport(): {
    healthy: boolean;
    issues: string[];
    metrics: any;
  } {
    const issues: string[] = [];
    
    // Check for stuck workflows
    const stuckWorkflows = this.getActiveWorkflows().filter(
      workflow => Date.now() - workflow.metadata.startTime > 300000 // 5 minutes
    );
    
    if (stuckWorkflows.length > 0) {
      issues.push(`${stuckWorkflows.length} workflows stuck for over 5 minutes`);
    }
    
    // Check error rates
    const highErrorBricks = Object.entries(this.stats.brickUtilization).filter(
      ([_, brick]) => brick.errorRate > 10 // 10% error rate threshold
    );
    
    if (highErrorBricks.length > 0) {
      issues.push(`${highErrorBricks.length} bricks with high error rates`);
    }
    
    // Check system health
    if (this.stats.systemHealth.overallScore < 80) {
      issues.push(`System health score low: ${this.stats.systemHealth.overallScore}`);
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      metrics: {
        activeWorkflows: this.stats.activeWorkflows,
        systemHealth: this.stats.systemHealth,
        stuckWorkflows: stuckWorkflows.length,
        highErrorBricks: highErrorBricks.length
      }
    };
  }
}