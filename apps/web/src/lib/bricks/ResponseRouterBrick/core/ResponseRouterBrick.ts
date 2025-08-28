/**
 * ResponseRouterBrick - LEGO Brick for Automatic Dual Response Routing
 * 
 * Single Responsibility: Route dual responses to appropriate storage destinations automatically
 * 
 * FIELD REPORT LEARNINGS APPLIED:
 * - Event-driven integration patterns for decoupled architecture
 * - Defensive brick API integration with flexible compatibility layer
 * - Comprehensive error handling with atomic operation rollbacks
 * - External configuration with robust defaults
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
  RoutingConfig,
  RoutingRequest,
  RoutingEvent,
  RoutingStats
} from '../types/RoutingTypes';

import type { DualResponse } from '$lib/bricks/DualResponseBrick/types/DualResponseTypes';
import { RoutingOrchestrator } from '../services/RoutingOrchestrator';

export class ResponseRouterBrick {
  private config: RoutingConfig | null = null;
  private orchestrator: RoutingOrchestrator | null = null;
  private initialized = false;
  private eventSubscriptions: Function[] = [];
  private stats: RoutingStats = {
    total_routings: 0,
    successful_routings: 0,
    failed_routings: 0,
    rollbacks_required: 0,
    rollbacks_completed: 0,
    average_routing_time_ms: 0,
    last_routing_timestamp: 0
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
   * Initialize ResponseRouterBrick with configuration and event subscriptions
   * Rule 2: Four Buses - Complete bus integration
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🔧 ResponseRouterBrick: Initializing...');
      
      // Load configuration
      await this.loadConfiguration();
      
      // Initialize services
      if (this.config) {
        this.orchestrator = new RoutingOrchestrator(this.config);
      }
      
      // Subscribe to events
      this.subscribeToEvents();
      
      // Set initial state
      this.stateBus.set('response-router:initialized', true);
      this.stateBus.set('response-router:config', this.config);
      this.stateBus.set('response-router:stats', this.stats);
      
      // Publish initialization success
      this.eventBus.publish('response-router:initialized', {
        success: true,
        config: this.config,
        timestamp: Date.now()
      });
      
      this.initialized = true;
      console.log('✅ ResponseRouterBrick: Initialization complete');
      
    } catch (error) {
      console.error('❌ ResponseRouterBrick: Initialization failed:', error);
      
      // Report error to ErrorBus
      this.errorBus.report(
        error instanceof Error ? error : new Error('ResponseRouterBrick initialization failed'),
        'ResponseRouterBrick',
        true // fatal
      );
      
      // Set error state
      this.stateBus.set('response-router:initialized', false);
      this.stateBus.set('response-router:error', error instanceof Error ? error.message : 'Unknown error');
      
      // Publish initialization failure
      this.eventBus.publish('response-router:initialized', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Load configuration from ConfigBus
   * FIELD REPORT LEARNING: Robust fallback configuration handling
   */
  private async loadConfiguration(): Promise<void> {
    try {
      this.config = await this.configBus.load<RoutingConfig>('ResponseRouterBrick');
      
      if (!this.config) {
        console.warn('⚠️ ResponseRouterBrick: No configuration found, using defaults');
        this.config = this.getDefaultConfiguration();
      }
      
      if (this.config.debugMode) {
        console.log('🔧 ResponseRouterBrick: Configuration loaded', this.config);
      }
      
    } catch (error) {
      console.error('❌ ResponseRouterBrick: Failed to load configuration:', error);
      
      // Fallback to defaults for graceful degradation
      this.config = this.getDefaultConfiguration();
      console.log('🔧 ResponseRouterBrick: Using fallback defaults');
    }
  }

  /**
   * Robust defaults ensure functionality even without config file
   * FIELD REPORT LEARNING: Comprehensive fallback defaults prevent initialization failures
   */
  private getDefaultConfiguration(): RoutingConfig {
    return {
      routingTargets: {
        normalResponse: 'SuperJournalBrick', // Route normal responses to SuperJournal
        machineTrim: 'JournalBrick' // Route machine trims to Journal
      },
      atomicOperations: true, // Enable atomic dual storage
      rollbackOnFailure: true, // Rollback on partial failures
      maxRetries: 3, // Retry failed operations
      retryDelayMs: 1000, // 1 second between retries
      timeoutMs: 15000, // 15 second timeout per operation
      enableRouting: true, // Enable automatic routing
      debugMode: false // Production-safe default
    };
  }

  /**
   * Subscribe to dual-response events
   * Rule 1: Webby - uses native EventTarget patterns
   */
  private subscribeToEvents(): void {
    if (!this.config?.enableRouting) {
      console.log('⏭️ ResponseRouterBrick: Routing disabled, skipping event subscriptions');
      return;
    }

    try {
      // Subscribe to dual response completion events
      const unsubscribeDualResponse = this.eventBus.subscribe('dual-response:generated', 
        this.handleDualResponseGenerated.bind(this)
      );
      this.eventSubscriptions.push(unsubscribeDualResponse);

      if (this.config?.debugMode) {
        console.log('📡 ResponseRouterBrick: Event subscriptions established');
      }

    } catch (error) {
      console.error('❌ ResponseRouterBrick: Failed to subscribe to events:', error);
      this.errorBus.report(
        error instanceof Error ? error : new Error('Event subscription failed'),
        'ResponseRouterBrick',
        false
      );
    }
  }

  /**
   * Handle dual response generated events
   * Main routing logic entry point
   */
  private async handleDualResponseGenerated(event: any): Promise<void> {
    if (!this.initialized || !this.orchestrator || !this.config) {
      console.warn('⚠️ ResponseRouterBrick: Not initialized, skipping routing');
      return;
    }

    try {
      // Extract dual response data from event
      const dualResponse = event.response as DualResponse;
      if (!dualResponse) {
        console.warn('⚠️ ResponseRouterBrick: No dual response data in event');
        return;
      }

      // Create routing request
      const routingRequest: RoutingRequest = {
        dualResponse,
        metadata: {
          turnId: event.turnId || `auto-${Date.now()}`,
          persona: event.persona || 'unknown',
          model: event.model || 'unknown',
          timestamp: Date.now(),
          routingId: `route-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        },
        timestamp: Date.now()
      };

      // Update stats
      this.stats.total_routings++;
      this.stats.last_routing_timestamp = Date.now();
      this.stateBus.set('response-router:stats', this.stats);

      // Publish routing started event
      this.publishRoutingEvent('routing:started', {
        routingId: routingRequest.metadata.routingId,
        success: true,
        operations_count: this.getOperationCount(),
        timestamp: Date.now()
      });

      // Execute routing
      const startTime = Date.now();
      await this.orchestrator.routeDualResponse(routingRequest);
      const routingTime = Date.now() - startTime;

      // Update stats for success
      this.stats.successful_routings++;
      this.updateAverageRoutingTime(routingTime);
      this.stateBus.set('response-router:stats', this.stats);

      // Publish success event
      this.publishRoutingEvent('routing:complete', {
        routingId: routingRequest.metadata.routingId,
        success: true,
        operations_count: this.getOperationCount(),
        performance: {
          total_time_ms: routingTime,
          operations_time_ms: routingTime
        },
        timestamp: Date.now()
      });

      if (this.config.debugMode) {
        console.log('✅ ResponseRouterBrick: Routing completed successfully', {
          routingId: routingRequest.metadata.routingId,
          routingTime
        });
      }

    } catch (error) {
      console.error('❌ ResponseRouterBrick: Routing failed:', error);

      // Update failure stats
      this.stats.failed_routings++;
      this.stateBus.set('response-router:stats', this.stats);

      // Report error
      this.errorBus.report(
        error instanceof Error ? error : new Error('Routing failed'),
        'ResponseRouterBrick',
        false
      );

      // Publish error event
      this.publishRoutingEvent('routing:error', {
        routingId: 'unknown',
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
      console.log('🔧 ResponseRouterBrick: Storage bricks configured', {
        superJournalBrick: !!superJournalBrick,
        journalBrick: !!journalBrick
      });
    }
  }

  /**
   * Publish standardized routing events to EventBus
   * Rule 2: Four Buses - Standard event publishing
   */
  private publishRoutingEvent(type: RoutingEvent['type'], data: RoutingEvent['data']): void {
    try {
      this.eventBus.publish(type, data);
      
      if (this.config?.debugMode) {
        console.log(`📡 ResponseRouterBrick: Published event ${type}`, data);
      }
    } catch (error) {
      console.error('❌ ResponseRouterBrick: Failed to publish event:', error);
    }
  }

  /**
   * Get operation count based on enabled routing targets
   */
  private getOperationCount(): number {
    if (!this.config) return 0;
    
    let count = 0;
    if (this.config.routingTargets.normalResponse !== 'disabled') count++;
    if (this.config.routingTargets.machineTrim !== 'disabled') count++;
    return count;
  }

  /**
   * Update average routing time with new sample
   */
  private updateAverageRoutingTime(newTime: number): void {
    const totalRoutings = this.stats.successful_routings;
    const oldAverage = this.stats.average_routing_time_ms;
    
    // Calculate running average
    this.stats.average_routing_time_ms = ((oldAverage * (totalRoutings - 1)) + newTime) / totalRoutings;
  }

  /**
   * Check if routing is available
   */
  get ready(): boolean {
    return this.initialized && this.orchestrator !== null && this.config?.enableRouting === true;
  }

  /**
   * Get current configuration
   */
  get configuration(): RoutingConfig | null {
    return this.config;
  }

  /**
   * Get routing statistics
   */
  get statistics(): RoutingStats {
    return { ...this.stats };
  }

  /**
   * Update configuration at runtime
   * Rule 8: No hardcoding - runtime reconfiguration support
   */
  async updateConfiguration(newConfig: Partial<RoutingConfig>): Promise<void> {
    if (!this.config) {
      console.error('❌ ResponseRouterBrick: Cannot update config - not initialized');
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
      this.stateBus.set('response-router:config', this.config);
      
      // Publish configuration update event
      this.eventBus.publish('response-router:config-updated', {
        config: this.config,
        timestamp: Date.now()
      });
      
      if (this.config.debugMode) {
        console.log('🔧 ResponseRouterBrick: Configuration updated', this.config);
      }
      
    } catch (error) {
      console.error('❌ ResponseRouterBrick: Failed to update configuration:', error);
      
      this.errorBus.report(
        error instanceof Error ? error : new Error('Configuration update failed'),
        'ResponseRouterBrick',
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
      console.log('🔄 ResponseRouterBrick: Shutting down...');
      
      // Unsubscribe from all events
      this.eventSubscriptions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('⚠️ ResponseRouterBrick: Error during event unsubscription:', error);
        }
      });
      this.eventSubscriptions = [];
      
      // Clear state
      this.stateBus.set('response-router:initialized', false);
      
      // Reset internal state
      this.initialized = false;
      this.orchestrator = null;
      this.config = null;
      this.superJournalBrick = null;
      this.journalBrick = null;
      
      // Publish shutdown event
      this.eventBus.publish('response-router:shutdown', {
        timestamp: Date.now()
      });
      
      console.log('✅ ResponseRouterBrick: Shutdown complete');
      
    } catch (error) {
      console.error('❌ ResponseRouterBrick: Shutdown error:', error);
    }
  }
}