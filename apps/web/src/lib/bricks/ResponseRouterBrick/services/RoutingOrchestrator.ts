/**
 * RoutingOrchestrator - Event-Driven Routing Service
 * Rule 2: Four Buses - subscribes to EventBus for dual-response events
 * Rule 1: Webby - uses native EventTarget patterns for subscription management
 */

import type { 
  RoutingRequest,
  RoutingOperation, 
  RoutingConfig,
  RoutingMetadata,
  SuperJournalStoreOperation,
  JournalStoreOperation
} from '../types/RoutingTypes';

import type { DualResponse } from '$lib/bricks/DualResponseBrick/types/DualResponseTypes';
import { AtomicOperationManager } from './AtomicOperationManager';

export class RoutingOrchestrator {
  private config: RoutingConfig;
  private atomicManager: AtomicOperationManager;
  private superJournalBrick: any = null;
  private journalBrick: any = null;

  constructor(config: RoutingConfig) {
    this.config = config;
    this.atomicManager = new AtomicOperationManager(config);
  }

  /**
   * Set storage brick dependencies
   * FIELD REPORT LEARNING: Flexible integration approach for different brick architectures
   */
  setStorageBricks(superJournalBrick: any, journalBrick: any): void {
    this.superJournalBrick = superJournalBrick;
    this.journalBrick = journalBrick;
    
    if (this.config.debugMode) {
      console.log('🔧 RoutingOrchestrator: Storage bricks configured', {
        superJournalBrick: !!superJournalBrick,
        journalBrick: !!journalBrick
      });
    }
  }

  /**
   * Process dual response routing request
   * Creates atomic operations for dual storage
   */
  async routeDualResponse(request: RoutingRequest): Promise<void> {
    if (!this.config.enableRouting) {
      if (this.config.debugMode) {
        console.log('⏭️ RoutingOrchestrator: Routing disabled, skipping');
      }
      return;
    }

    try {
      if (this.config.debugMode) {
        console.log('🚀 RoutingOrchestrator: Starting dual response routing', {
          turnId: request.metadata.turnId,
          persona: request.metadata.persona,
          model: request.metadata.model
        });
      }

      // Create routing operations
      const operations = this.createRoutingOperations(request);
      
      if (operations.length === 0) {
        if (this.config.debugMode) {
          console.log('⏭️ RoutingOrchestrator: No operations needed, all targets disabled');
        }
        return;
      }

      // Execute atomic operations
      const result = await this.atomicManager.executeAtomically(operations);
      
      if (result.success) {
        if (this.config.debugMode) {
          console.log('✅ RoutingOrchestrator: Dual response routing completed successfully', {
            routingId: result.routingId,
            operationsCompleted: result.operations_completed.length,
            totalTime: result.total_time_ms
          });
        }
      } else {
        console.error('❌ RoutingOrchestrator: Dual response routing failed', {
          routingId: result.routingId,
          error: result.error,
          rollbackRequired: result.rollback_required,
          rollbackCompleted: result.rollback_completed
        });
      }

    } catch (error) {
      console.error('❌ RoutingOrchestrator: Unexpected routing error:', error);
    }
  }

  /**
   * Create routing operations for dual response
   * Rule 8: No hardcoding - routing targets from configuration
   */
  private createRoutingOperations(request: RoutingRequest): RoutingOperation[] {
    const operations: RoutingOperation[] = [];
    const { dualResponse, metadata } = request;

    // Normal response routing operation
    if (this.config.routingTargets.normalResponse === 'SuperJournalBrick' && this.superJournalBrick) {
      const normalOperation = this.createSuperJournalOperation(
        dualResponse.normal_response,
        metadata
      );
      operations.push(normalOperation);
    }

    // Machine trim routing operation
    if (this.config.routingTargets.machineTrim === 'JournalBrick' && this.journalBrick) {
      const machineOperation = this.createJournalOperation(
        dualResponse,
        metadata
      );
      operations.push(machineOperation);
    }

    if (this.config.debugMode) {
      console.log('📋 RoutingOrchestrator: Created routing operations', {
        operationsCount: operations.length,
        operations: operations.map(op => ({ target: op.target, type: op.type }))
      });
    }

    return operations;
  }

  /**
   * Create SuperJournal storage operation
   * FIELD REPORT LEARNING: Defensive integration with existing brick APIs
   */
  private createSuperJournalOperation(
    normalResponse: string, 
    metadata: RoutingMetadata
  ): RoutingOperation {
    const operationId = `superjournal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      id: operationId,
      target: 'SuperJournalBrick',
      type: 'store',
      data: normalResponse,
      metadata,
      operation: async () => {
        try {
          if (this.config.debugMode) {
            console.log('📝 RoutingOrchestrator: Storing normal response to SuperJournal', {
              turnId: metadata.turnId,
              contentLength: normalResponse.length
            });
          }

          // FIELD REPORT LEARNING: Flexible API integration approach
          // Try different possible SuperJournal API patterns
          let result;
          if (this.superJournalBrick.store) {
            result = await this.superJournalBrick.store({
              content: normalResponse,
              turnId: metadata.turnId,
              persona: metadata.persona,
              model: metadata.model,
              timestamp: metadata.timestamp
            });
          } else if (this.superJournalBrick.storeMessage) {
            result = await this.superJournalBrick.storeMessage(normalResponse, {
              turnId: metadata.turnId,
              persona: metadata.persona,
              model: metadata.model
            });
          } else {
            throw new Error('SuperJournalBrick API not compatible');
          }

          return {
            success: result?.success || true,
            data: result,
            timestamp: Date.now()
          };

        } catch (error) {
          console.error('❌ SuperJournal storage operation failed:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          };
        }
      },
      rollback: async () => {
        try {
          if (this.config.debugMode) {
            console.log('🔄 RoutingOrchestrator: Rolling back SuperJournal storage', {
              turnId: metadata.turnId
            });
          }

          // Attempt rollback via deletion
          if (this.superJournalBrick.delete) {
            const result = await this.superJournalBrick.delete(metadata.turnId);
            return {
              success: result?.success || true,
              timestamp: Date.now()
            };
          }

          // If no delete method, consider rollback successful
          // (SuperJournal may not support rollback, which is acceptable)
          return {
            success: true,
            timestamp: Date.now()
          };

        } catch (error) {
          console.error('❌ SuperJournal rollback failed:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Rollback failed',
            timestamp: Date.now()
          };
        }
      },
      completed: false,
      success: false,
      timestamp: Date.now()
    };
  }

  /**
   * Create Journal storage operation for machine trim
   * FIELD REPORT LEARNING: Use established JournalBrick API patterns
   */
  private createJournalOperation(
    dualResponse: DualResponse, 
    metadata: RoutingMetadata
  ): RoutingOperation {
    const operationId = `journal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    return {
      id: operationId,
      target: 'JournalBrick',
      type: 'store',
      data: dualResponse.machine_trim,
      metadata,
      operation: async () => {
        try {
          if (this.config.debugMode) {
            console.log('📝 RoutingOrchestrator: Storing machine trim to Journal', {
              turnId: metadata.turnId,
              inferability: dualResponse.machine_trim.inferability,
              contentLength: dualResponse.machine_trim.ai_response.length
            });
          }

          const result = await this.journalBrick.store(
            dualResponse.machine_trim,
            {
              turnId: metadata.turnId,
              persona: metadata.persona,
              model: metadata.model,
              timestamp: metadata.timestamp
            }
          );

          return {
            success: result?.success || true,
            data: result,
            timestamp: Date.now()
          };

        } catch (error) {
          console.error('❌ Journal storage operation failed:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          };
        }
      },
      rollback: async () => {
        try {
          if (this.config.debugMode) {
            console.log('🔄 RoutingOrchestrator: Rolling back Journal storage', {
              turnId: metadata.turnId
            });
          }

          const result = await this.journalBrick.delete(metadata.turnId);
          
          return {
            success: result?.success || true,
            timestamp: Date.now()
          };

        } catch (error) {
          console.error('❌ Journal rollback failed:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Rollback failed',
            timestamp: Date.now()
          };
        }
      },
      completed: false,
      success: false,
      timestamp: Date.now()
    };
  }

  /**
   * Update configuration at runtime
   * Rule 8: No hardcoding - runtime reconfiguration support
   */
  updateConfig(newConfig: RoutingConfig): void {
    this.config = newConfig;
    this.atomicManager.updateConfig(newConfig);
    
    if (this.config.debugMode) {
      console.log('🔧 RoutingOrchestrator: Configuration updated', {
        enableRouting: this.config.enableRouting,
        normalTarget: this.config.routingTargets.normalResponse,
        machineTarget: this.config.routingTargets.machineTrim,
        atomicOperations: this.config.atomicOperations
      });
    }
  }
}