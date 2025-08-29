/**
 * DualResponseOrchestratorBrick - Master coordination for dual-response machine trim system
 * 
 * Following Essential Boss Rules:
 * - Rule 4: LEGO Bricks - Single responsibility master orchestrator
 * - Rule 2: Four Buses - Full EventBus, ConfigBus, StateBus, ErrorBus integration
 * - Rule 5: Easy Removal - Graceful degradation when removed
 * - Rule 8: No Hardcoding - External configuration with runtime updates
 * - Rule 9: Debug with Discipline - Field report learnings applied
 */

import type { WorkflowConfig } from '../types/OrchestratorTypes';
import { WorkflowCoordinator } from '../services/WorkflowCoordinator';

export class DualResponseOrchestratorBrick {
  private coordinator: WorkflowCoordinator | null = null;
  private config: WorkflowConfig | null = null;
  private buses: {
    eventBus?: any;
    configBus?: any;
    stateBus?: any;
    errorBus?: any;
  } = {};
  private pendingBricks: any = null;
  private isInitialized: boolean = false;
  private isDestroyed: boolean = false;
  private configLoadPromise: Promise<void> | null = null;
  
  constructor() {
    // Initialize with async configuration loading to prevent startup race conditions
    this.configLoadPromise = this.initializeAsync();
  }
  
  /**
   * Async initialization to load external configuration
   */
  private async initializeAsync(): Promise<void> {
    try {
      await this.loadConfiguration();
      this.coordinator = new WorkflowCoordinator(this.config!);
    } catch (error) {
      console.error('❌ DualResponseOrchestratorBrick: Async initialization failed', error);
      // Create with default config as fallback
      this.createDefaultConfig();
      this.coordinator = new WorkflowCoordinator(this.config!);
    }
  }
  
  /**
   * Load configuration from external JSON file
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const response = await fetch('/aetherVault/config/DualResponseOrchestratorBrick.json');
      
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
      }
      
      this.config = await response.json();
      
      if (this.config?.debugMode) {
        console.log('📋 DualResponseOrchestratorBrick: Configuration loaded', this.config);
      }
      
    } catch (error) {
      console.warn('⚠️ DualResponseOrchestratorBrick: Config load failed, using defaults', error);
      this.createDefaultConfig();
    }
  }
  
  /**
   * Create default configuration fallback
   */
  private createDefaultConfig(): void {
    this.config = {
      enableDualResponse: true,
      enableMachineTrim: true,
      enableResponseRouting: true,
      enableSynchronizedDeletion: true,
      storageTargets: {
        primary: 'SuperJournalBrick',
        secondary: 'JournalBrick'
      },
      timeouts: {
        messageTurn: 30000,
        machineTrim: 60000,
        responseRouting: 15000,
        storagePersistence: 30000,
        deletion: 15000
      },
      retries: {
        maxAttempts: 3,
        backoffMs: 1000,
        enableExponentialBackoff: true
      },
      monitoring: {
        enablePerformanceTracking: true,
        enableDetailedLogging: false,
        enableErrorReporting: true
      },
      debugMode: false
    };
  }
  
  /**
   * Set bus dependencies (Rule 2: Four Buses)
   */
  setBuses(buses: {
    eventBus?: any;
    configBus?: any;
    stateBus?: any;
    errorBus?: any;
  }): void {
    this.buses = { ...this.buses, ...buses };
    
    // Subscribe to configuration updates
    if (this.buses.configBus && typeof this.buses.configBus.subscribe === 'function') {
      this.buses.configBus.subscribe('DualResponseOrchestratorBrick', this.handleConfigUpdate.bind(this));
    }
    
    if (this.config?.debugMode) {
      console.log('🚌 DualResponseOrchestratorBrick: Buses configured', {
        eventBus: !!buses.eventBus,
        configBus: !!buses.configBus,
        stateBus: !!buses.stateBus,
        errorBus: !!buses.errorBus
      });
    }
  }
  
  /**
   * Set brick dependencies for orchestration
   */
  setBricks(bricks: {
    messageTurnBrick?: any;
    machineTrimBrick?: any;
    responseRouterBrick?: any;
    superJournalBrick?: any;
    journalBrick?: any;
    synchronizedDeletionBrick?: any;
  }): void {
    // Store bricks to register after initialization
    this.pendingBricks = bricks;
    
    // If coordinator is already available, register immediately
    if (this.coordinator) {
      this.coordinator.registerBricks(bricks);
      
      if (this.config?.debugMode) {
        console.log('🧱 DualResponseOrchestratorBrick: Bricks registered', {
          bricksCount: Object.keys(bricks).length,
          brickNames: Object.keys(bricks)
        });
      }
    } else {
      if (this.config?.debugMode) {
        console.log('🧱 DualResponseOrchestratorBrick: Bricks stored for later registration', {
          bricksCount: Object.keys(bricks).length,
          brickNames: Object.keys(bricks)
        });
      }
    }
  }
  
  /**
   * Initialize orchestrator with all dependencies
   */
  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Cannot initialize destroyed DualResponseOrchestratorBrick');
    }
    
    // Wait for async configuration loading
    if (this.configLoadPromise) {
      await this.configLoadPromise;
      this.configLoadPromise = null;
    }
    
    if (!this.coordinator) {
      throw new Error('Coordinator not available after initialization');
    }
    
    // Initialize coordinator with buses
    await this.coordinator.initialize(this.buses);
    
    // Register any pending bricks
    if (this.pendingBricks) {
      this.coordinator.registerBricks(this.pendingBricks);
      
      if (this.config?.debugMode) {
        console.log('🧱 DualResponseOrchestratorBrick: Pending bricks registered', {
          bricksCount: Object.keys(this.pendingBricks).length,
          brickNames: Object.keys(this.pendingBricks)
        });
      }
    }
    
    this.isInitialized = true;
    
    // Publish initialization event
    if (this.buses.eventBus) {
      this.buses.eventBus.publish('orchestrator:initialized', {
        timestamp: Date.now(),
        config: this.config
      });
    }
    
    if (this.config?.debugMode) {
      console.log('✅ DualResponseOrchestratorBrick: Fully initialized');
    }
  }
  
  /**
   * Process user message through complete dual-response workflow
   */
  async processMessage(
    userMessage: string,
    metadata: any = {},
    customConfig?: Partial<WorkflowConfig>
  ): Promise<any> {
    if (!this.isInitialized || !this.coordinator) {
      await this.initialize();
    }
    
    try {
      const result = await this.coordinator!.processMessage(userMessage, metadata, customConfig);
      
      // Report successful processing to StateBus
      if (this.buses.stateBus) {
        this.buses.stateBus.publish('orchestrator:processing', {
          type: 'message:processed',
          workflowId: result.workflowId,
          success: result.success,
          duration: result.performance.totalDuration,
          timestamp: Date.now()
        });
      }
      
      return result;
      
    } catch (error) {
      // Report errors to ErrorBus
      if (this.buses.errorBus) {
        this.buses.errorBus.publish('orchestrator:error', {
          type: 'message:processing:failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          userMessage: userMessage.substring(0, 100),
          timestamp: Date.now()
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Process deletion through orchestrated workflow
   */
  async processDeletion(
    turnId: string,
    requestedBy: string = 'system',
    reason: string = 'user_requested'
  ): Promise<{ success: boolean; deletionId: string; error?: string }> {
    if (!this.isInitialized || !this.coordinator) {
      await this.initialize();
    }
    
    try {
      const result = await this.coordinator!.processDeletion(turnId, requestedBy, reason);
      
      // Report to StateBus
      if (this.buses.stateBus) {
        this.buses.stateBus.publish('orchestrator:deletion', {
          type: 'deletion:processed',
          deletionId: result.deletionId,
          turnId,
          success: result.success,
          timestamp: Date.now()
        });
      }
      
      return result;
      
    } catch (error) {
      // Report errors
      if (this.buses.errorBus) {
        this.buses.errorBus.publish('orchestrator:error', {
          type: 'deletion:processing:failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          turnId,
          timestamp: Date.now()
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Get orchestrator statistics and health
   */
  getStatistics(): any {
    if (!this.coordinator) {
      return {
        initialized: this.isInitialized,
        error: 'Coordinator not available'
      };
    }
    
    return this.coordinator.getStatistics();
  }
  
  /**
   * Get active workflows
   */
  getActiveWorkflows(): any[] {
    if (!this.coordinator) {
      return [];
    }
    
    return this.coordinator.getActiveWorkflows();
  }
  
  /**
   * Perform health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    brick: boolean;
    coordinator: any;
    timestamp: number;
  }> {
    const brickHealthy = this.isInitialized && !this.isDestroyed && !!this.coordinator;
    
    let coordinatorHealth = null;
    if (this.coordinator) {
      try {
        coordinatorHealth = await this.coordinator.healthCheck();
      } catch (error) {
        coordinatorHealth = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return {
      healthy: brickHealthy && (coordinatorHealth?.healthy ?? false),
      brick: brickHealthy,
      coordinator: coordinatorHealth,
      timestamp: Date.now()
    };
  }
  
  /**
   * Handle configuration updates from ConfigBus
   */
  private async handleConfigUpdate(newConfig: Partial<WorkflowConfig>): Promise<void> {
    if (!newConfig) return;
    
    // Update local config
    this.config = { ...this.config!, ...newConfig };
    
    // Update coordinator if available
    if (this.coordinator) {
      this.coordinator.updateConfig(newConfig);
    }
    
    // Publish config update event
    if (this.buses.eventBus) {
      this.buses.eventBus.publish('orchestrator:config:updated', {
        config: this.config,
        timestamp: Date.now()
      });
    }
    
    if (this.config?.debugMode) {
      console.log('🔧 DualResponseOrchestratorBrick: Configuration updated', newConfig);
    }
  }
  
  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<WorkflowConfig>): void {
    this.handleConfigUpdate(newConfig);
  }
  
  /**
   * Graceful shutdown and cleanup
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }
    
    this.isDestroyed = true;
    
    // Shutdown coordinator
    if (this.coordinator) {
      await this.coordinator.shutdown();
      this.coordinator = null;
    }
    
    // Unsubscribe from ConfigBus
    if (this.buses.configBus && typeof this.buses.configBus.unsubscribe === 'function') {
      this.buses.configBus.unsubscribe('DualResponseOrchestratorBrick');
    }
    
    // Publish destruction event
    if (this.buses.eventBus) {
      this.buses.eventBus.publish('orchestrator:destroyed', {
        timestamp: Date.now()
      });
    }
    
    // Clear references
    this.buses = {};
    this.config = null;
    this.isInitialized = false;
    
    if (this.config?.debugMode) {
      console.log('🗑️ DualResponseOrchestratorBrick: Destroyed and cleaned up');
    }
  }
  
  /**
   * Check if brick is ready for operation
   */
  isReady(): boolean {
    return this.isInitialized && !this.isDestroyed && !!this.coordinator;
  }
  
  /**
   * Get brick configuration
   */
  getConfig(): WorkflowConfig | null {
    return this.config;
  }
  
  /**
   * Force reload configuration from external file
   */
  async reloadConfig(): Promise<void> {
    await this.loadConfiguration();
    
    if (this.coordinator) {
      this.coordinator.updateConfig(this.config!);
    }
    
    if (this.buses.eventBus) {
      this.buses.eventBus.publish('orchestrator:config:reloaded', {
        config: this.config,
        timestamp: Date.now()
      });
    }
  }
}