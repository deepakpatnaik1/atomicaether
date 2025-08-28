/**
 * SynchronizedDeletionBrick - LEGO Brick for Atomic Dual Storage Deletion
 * 
 * Single Responsibility: Coordinate atomic deletion across SuperJournal + Journal storage
 * 
 * FIELD REPORT LEARNINGS APPLIED:
 * - Global bus singleton usage (no isolated instances)
 * - Proper async configuration loading with await
 * - Architecture-first implementation without reactive debugging
 * - Rule 9 compliance: Debug with Discipline
 * 
 * Rule 2: Four Buses - Complete EventBus, ConfigBus, StateBus, ErrorBus integration
 * Rule 5: Easy removal - Clean shutdown with event unsubscription
 */

import type { 
  EventBus, 
  ConfigBus, 
  StateBus, 
  ErrorBus 
} from '$lib/buses/types';

import type { 
  DeletionConfig,
  DeletionRequest,
  DeletionEvent,
  DeletionStats
} from '../types/DeletionTypes';

import { DeletionOrchestrator } from '../services/DeletionOrchestrator';

export class SynchronizedDeletionBrick {
  private config: DeletionConfig | null = null;
  private orchestrator: DeletionOrchestrator | null = null;
  private initialized = false;
  private eventSubscriptions: Function[] = [];
  private stats: DeletionStats = {
    totalDeletions: 0,
    successfulDeletions: 0,
    failedDeletions: 0,
    rollbacksRequired: 0,
    rollbacksCompleted: 0,
    averageDeletionTimeMs: 0,
    lastDeletionTimestamp: 0
  };

  // Storage brick dependencies
  private superJournalBrick: any = null;
  private journalBrick: any = null;

  constructor(
    private eventBus: EventBus,
    private configBus: ConfigBus,
    private stateBus: StateBus,
    private errorBus: ErrorBus
  ) {
    this.initialize();
  }

  /**
   * Initialize SynchronizedDeletionBrick with configuration and event subscriptions
   * FIELD REPORT LEARNING: Proper async configuration loading
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🔧 SynchronizedDeletionBrick: Initializing...');
      
      // FIELD REPORT LEARNING: Await async configuration loading
      await this.loadConfiguration();
      
      // Initialize services
      if (this.config) {
        this.orchestrator = new DeletionOrchestrator(this.config);
      }
      
      // Subscribe to events
      this.subscribeToEvents();
      
      // Set initial state
      this.stateBus.set('synchronized-deletion:initialized', true);
      this.stateBus.set('synchronized-deletion:config', this.config);
      this.stateBus.set('synchronized-deletion:stats', this.stats);
      
      // Publish initialization success
      this.eventBus.publish('synchronized-deletion:initialized', {
        success: true,
        config: this.config,
        timestamp: Date.now()
      });
      
      this.initialized = true;
      console.log('✅ SynchronizedDeletionBrick: Initialization complete');
      
    } catch (error) {
      console.error('❌ SynchronizedDeletionBrick: Initialization failed:', error);
      
      // Report error to ErrorBus
      this.errorBus.report(
        error instanceof Error ? error : new Error('SynchronizedDeletionBrick initialization failed'),
        'SynchronizedDeletionBrick',
        true // fatal
      );
      
      // Set error state
      this.stateBus.set('synchronized-deletion:initialized', false);
      this.stateBus.set('synchronized-deletion:error', error instanceof Error ? error.message : 'Unknown error');
      
      // Publish initialization failure
      this.eventBus.publish('synchronized-deletion:initialized', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Load configuration from ConfigBus with proper async handling
   * FIELD REPORT LEARNING: Always await async ConfigBus operations
   */
  private async loadConfiguration(): Promise<void> {
    try {
      // FIELD REPORT LEARNING: Proper async configuration loading
      this.config = await this.configBus.load<DeletionConfig>('SynchronizedDeletionBrick');
      
      if (!this.config) {
        console.warn('⚠️ SynchronizedDeletionBrick: No configuration found, using defaults');
        this.config = this.getDefaultConfiguration();
      }
      
      if (this.config.debugMode) {
        console.log('🔧 SynchronizedDeletionBrick: Configuration loaded', this.config);
      }
      
    } catch (error) {
      console.error('❌ SynchronizedDeletionBrick: Failed to load configuration:', error);
      
      // Fallback to defaults for graceful degradation
      this.config = this.getDefaultConfiguration();
      console.log('🔧 SynchronizedDeletionBrick: Using fallback defaults');
    }
  }

  /**
   * Robust defaults ensure functionality even without config file
   */
  private getDefaultConfiguration(): DeletionConfig {
    return {
      enableSynchronizedDeletion: true,
      atomicOperations: true,
      rollbackOnFailure: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 15000,
      deletionTargets: {
        normalResponse: 'SuperJournalBrick',
        machineTrim: 'JournalBrick'
      },
      debugMode: false
    };
  }

  /**
   * Subscribe to turn deletion events
   * Rule 1: Webby - uses native EventTarget patterns
   */
  private subscribeToEvents(): void {
    if (!this.config?.enableSynchronizedDeletion) {
      console.log('⏭️ SynchronizedDeletionBrick: Synchronized deletion disabled, skipping event subscriptions');
      return;
    }

    try {
      // Subscribe to turn deletion request events
      const unsubscribeDeletion = this.eventBus.subscribe('turn:delete:request', 
        this.handleDeletionRequest.bind(this)
      );
      this.eventSubscriptions.push(unsubscribeDeletion);

      if (this.config?.debugMode) {
        console.log('📡 SynchronizedDeletionBrick: Event subscriptions established');
      }

    } catch (error) {
      console.error('❌ SynchronizedDeletionBrick: Failed to subscribe to events:', error);
      this.errorBus.report(
        error instanceof Error ? error : new Error('Event subscription failed'),
        'SynchronizedDeletionBrick',
        false
      );
    }
  }

  /**
   * Handle turn deletion request events
   * Main deletion logic entry point
   */
  private async handleDeletionRequest(event: any): Promise<void> {
    if (!this.initialized || !this.orchestrator || !this.config) {
      console.warn('⚠️ SynchronizedDeletionBrick: Not initialized, skipping deletion');
      return;
    }

    try {
      // Create deletion request from event data
      const deletionRequest: DeletionRequest = {
        deletionId: event.deletionId || `del-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        turnId: event.turnId,
        metadata: {
          requestedBy: event.requestedBy || 'unknown',
          reason: event.reason,
          timestamp: Date.now(),
          priority: event.priority || 'normal'
        },
        timestamp: Date.now()
      };

      // Update stats
      this.stats.totalDeletions++;
      this.stats.lastDeletionTimestamp = Date.now();
      this.stateBus.set('synchronized-deletion:stats', this.stats);

      // Publish deletion started event
      this.publishDeletionEvent('deletion:started', {
        deletionId: deletionRequest.deletionId,
        turnId: deletionRequest.turnId,
        success: true,
        operationsCount: this.getOperationCount(),
        timestamp: Date.now()
      });

      // Execute deletion
      const startTime = Date.now();
      const result = await this.orchestrator.deleteTurn(deletionRequest);
      const deletionTime = Date.now() - startTime;

      // Update stats based on result
      if (result.success) {
        this.stats.successfulDeletions++;
      } else {
        this.stats.failedDeletions++;
      }

      if (result.rollback?.required) {
        this.stats.rollbacksRequired++;
        if (result.rollback.completed) {
          this.stats.rollbacksCompleted++;
        }
      }

      this.updateAverageDeletionTime(deletionTime);
      this.stateBus.set('synchronized-deletion:stats', this.stats);

      // Publish appropriate completion event
      if (result.success) {
        this.publishDeletionEvent('deletion:complete', {
          deletionId: deletionRequest.deletionId,
          turnId: deletionRequest.turnId,
          success: true,
          operationsCount: this.getOperationCount(),
          performance: {
            totalTimeMs: result.performance.totalTimeMs,
            operationsTimeMs: result.performance.operationsTimeMs,
            retryCount: result.performance.retryCount
          },
          timestamp: Date.now()
        });
      } else {
        this.publishDeletionEvent('deletion:error', {
          deletionId: deletionRequest.deletionId,
          turnId: deletionRequest.turnId,
          success: false,
          error: 'Deletion failed - check individual operation errors',
          rollback: result.rollback,
          timestamp: Date.now()
        });
      }

      if (this.config.debugMode) {
        console.log('✅ SynchronizedDeletionBrick: Deletion completed', {
          deletionId: deletionRequest.deletionId,
          success: result.success,
          deletionTime
        });
      }

    } catch (error) {
      console.error('❌ SynchronizedDeletionBrick: Deletion failed:', error);

      // Update failure stats
      this.stats.failedDeletions++;
      this.stateBus.set('synchronized-deletion:stats', this.stats);

      // Report error
      this.errorBus.report(
        error instanceof Error ? error : new Error('Deletion failed'),
        'SynchronizedDeletionBrick',
        false
      );

      // Publish error event
      this.publishDeletionEvent('deletion:error', {
        deletionId: 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Set storage brick dependencies
   * FIELD REPORT LEARNING: Flexible integration approach for different brick architectures
   */
  setStorageBricks(superJournalBrick: any, journalBrick: any): void {
    this.superJournalBrick = superJournalBrick;
    this.journalBrick = journalBrick;
    
    // Update orchestrator with storage bricks
    if (this.orchestrator) {
      this.orchestrator.setStorageBricks(superJournalBrick, journalBrick);
    }
    
    if (this.config?.debugMode) {
      console.log('🔧 SynchronizedDeletionBrick: Storage bricks configured', {
        superJournalBrick: !!superJournalBrick,
        journalBrick: !!journalBrick
      });
    }
  }

  /**
   * Publish standardized deletion events to EventBus
   * Rule 2: Four Buses - Standard event publishing
   */
  private publishDeletionEvent(type: DeletionEvent['type'], data: DeletionEvent['data']): void {
    try {
      this.eventBus.publish(type, data);
      
      if (this.config?.debugMode) {
        console.log(`📡 SynchronizedDeletionBrick: Published event ${type}`, data);
      }
    } catch (error) {
      console.error('❌ SynchronizedDeletionBrick: Failed to publish event:', error);
    }
  }

  /**
   * Get operation count based on enabled deletion targets
   */
  private getOperationCount(): number {
    if (!this.config) return 0;
    
    let count = 0;
    if (this.config.deletionTargets?.normalResponse !== 'disabled') count++;
    if (this.config.deletionTargets?.machineTrim !== 'disabled') count++;
    return count;
  }

  /**
   * Update average deletion time with new sample
   */
  private updateAverageDeletionTime(newTime: number): void {
    const totalDeletions = this.stats.successfulDeletions + this.stats.failedDeletions;
    const oldAverage = this.stats.averageDeletionTimeMs;
    
    // Calculate running average
    if (totalDeletions > 0) {
      this.stats.averageDeletionTimeMs = ((oldAverage * (totalDeletions - 1)) + newTime) / totalDeletions;
    }
  }

  /**
   * Check if deletion service is available
   */
  get ready(): boolean {
    return this.initialized && this.orchestrator !== null && this.config?.enableSynchronizedDeletion === true;
  }

  /**
   * Get current configuration
   */
  get configuration(): DeletionConfig | null {
    return this.config;
  }

  /**
   * Get deletion statistics
   */
  get statistics(): DeletionStats {
    return { ...this.stats };
  }

  /**
   * Update configuration at runtime
   * Rule 8: No hardcoding - runtime reconfiguration support
   */
  async updateConfiguration(newConfig: Partial<DeletionConfig>): Promise<void> {
    if (!this.config) {
      console.error('❌ SynchronizedDeletionBrick: Cannot update config - not initialized');
      return;
    }

    try {
      // Merge with existing config
      this.config = { ...this.config, ...newConfig };
      
      // Update orchestrator configuration
      if (this.orchestrator) {
        this.orchestrator.updateConfig(this.config);
      }
      
      // Update state
      this.stateBus.set('synchronized-deletion:config', this.config);
      
      // Publish configuration update event
      this.eventBus.publish('synchronized-deletion:config-updated', {
        config: this.config,
        timestamp: Date.now()
      });
      
      if (this.config.debugMode) {
        console.log('🔧 SynchronizedDeletionBrick: Configuration updated', this.config);
      }
      
    } catch (error) {
      console.error('❌ SynchronizedDeletionBrick: Failed to update configuration:', error);
      
      this.errorBus.report(
        error instanceof Error ? error : new Error('Configuration update failed'),
        'SynchronizedDeletionBrick',
        false
      );
    }
  }

  /**
   * Graceful shutdown - cleanup resources
   * Rule 5: Easy removal - proper cleanup and event unsubscription
   */
  destroy(): void {
    try {
      console.log('🔄 SynchronizedDeletionBrick: Shutting down...');
      
      // Unsubscribe from all events
      this.eventSubscriptions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('⚠️ SynchronizedDeletionBrick: Error during event unsubscription:', error);
        }
      });
      this.eventSubscriptions = [];
      
      // Clear state
      this.stateBus.set('synchronized-deletion:initialized', false);
      
      // Reset internal state
      this.initialized = false;
      this.orchestrator = null;
      this.config = null;
      this.superJournalBrick = null;
      this.journalBrick = null;
      
      // Publish shutdown event
      this.eventBus.publish('synchronized-deletion:shutdown', {
        timestamp: Date.now()
      });
      
      console.log('✅ SynchronizedDeletionBrick: Shutdown complete');
      
    } catch (error) {
      console.error('❌ SynchronizedDeletionBrick: Shutdown error:', error);
    }
  }
}