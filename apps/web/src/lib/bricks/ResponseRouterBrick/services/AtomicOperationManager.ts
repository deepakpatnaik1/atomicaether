/**
 * AtomicOperationManager - Reliable Dual Storage Operations
 * Rule 6: Don't reinvent - uses established transaction patterns
 * Rule 9: Debug with discipline - comprehensive error handling without removal
 */

import type { 
  RoutingOperation, 
  RoutingOperationResult, 
  AtomicRoutingResult,
  RoutingConfig
} from '../types/RoutingTypes';

export class AtomicOperationManager {
  private config: RoutingConfig;

  constructor(config: RoutingConfig) {
    this.config = config;
  }

  /**
   * Execute multiple operations atomically - all succeed or all rollback
   * Rule 9: Debug with discipline - preserve all error handling
   */
  async executeAtomically(operations: RoutingOperation[]): Promise<AtomicRoutingResult> {
    const startTime = Date.now();
    const routingId = this.generateRoutingId();
    
    const result: AtomicRoutingResult = {
      success: false,
      routingId,
      operations_attempted: [...operations],
      operations_completed: [],
      operations_failed: [],
      rollback_required: false,
      rollback_completed: false,
      total_time_ms: 0,
      timestamp: Date.now()
    };

    if (this.config.debugMode) {
      console.log('🔄 AtomicOperationManager: Starting atomic execution', {
        routingId,
        operationsCount: operations.length,
        operations: operations.map(op => ({ id: op.id, target: op.target, type: op.type }))
      });
    }

    try {
      // Phase 1: Execute all operations
      const executionResults = await this.executeOperations(operations);
      result.operations_completed = executionResults.completed;
      result.operations_failed = executionResults.failed;

      // Phase 2: Determine if rollback needed
      const hasFailures = executionResults.failed.length > 0;
      const hasSuccesses = executionResults.completed.length > 0;

      if (hasFailures && hasSuccesses && this.config.rollbackOnFailure) {
        // Partial failure - rollback required
        result.rollback_required = true;
        
        if (this.config.debugMode) {
          console.warn('⚠️ AtomicOperationManager: Partial failure detected, initiating rollback', {
            completed: executionResults.completed.length,
            failed: executionResults.failed.length
          });
        }

        // Phase 3: Execute rollbacks
        const rollbackResult = await this.executeRollbacks(executionResults.completed);
        result.rollback_completed = rollbackResult.success;
        
        if (!rollbackResult.success) {
          result.error = `Rollback failed: ${rollbackResult.error}`;
        }

      } else if (!hasFailures) {
        // All operations succeeded
        result.success = true;
        
        if (this.config.debugMode) {
          console.log('✅ AtomicOperationManager: All operations completed successfully', {
            routingId,
            operationsCount: executionResults.completed.length
          });
        }

      } else {
        // Total failure - no rollback needed
        result.error = `All operations failed: ${executionResults.failed.map(op => op.error).join(', ')}`;
        
        if (this.config.debugMode) {
          console.error('❌ AtomicOperationManager: All operations failed', {
            routingId,
            errors: executionResults.failed.map(op => op.error)
          });
        }
      }

    } catch (error) {
      result.error = `Atomic execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ AtomicOperationManager: Unexpected error during atomic execution:', error);
    }

    result.total_time_ms = Date.now() - startTime;
    return result;
  }

  /**
   * Execute all operations with individual error handling
   * Rule 9: Debug with discipline - never remove try/catch blocks
   */
  private async executeOperations(operations: RoutingOperation[]): Promise<{
    completed: RoutingOperation[];
    failed: RoutingOperation[];
  }> {
    const completed: RoutingOperation[] = [];
    const failed: RoutingOperation[] = [];

    // Execute operations in parallel for performance
    const operationPromises = operations.map(async (operation) => {
      try {
        const startTime = Date.now();
        const result = await this.executeWithTimeout(operation.operation(), this.config.timeoutMs);
        
        operation.completed = true;
        operation.success = result.success;
        operation.timestamp = Date.now();

        if (result.success) {
          completed.push(operation);
          
          if (this.config.debugMode) {
            console.log(`✅ Operation ${operation.id} completed:`, {
              target: operation.target,
              type: operation.type,
              duration: Date.now() - startTime
            });
          }
        } else {
          operation.error = result.error;
          failed.push(operation);
          
          if (this.config.debugMode) {
            console.error(`❌ Operation ${operation.id} failed:`, {
              target: operation.target,
              error: result.error
            });
          }
        }

      } catch (error) {
        operation.completed = true;
        operation.success = false;
        operation.error = error instanceof Error ? error.message : 'Unknown error';
        operation.timestamp = Date.now();
        failed.push(operation);

        console.error(`❌ Operation ${operation.id} threw exception:`, error);
      }
    });

    await Promise.all(operationPromises);

    return { completed, failed };
  }

  /**
   * Execute rollback operations for completed operations
   * Rule 6: Don't reinvent - standard rollback patterns
   */
  private async executeRollbacks(completedOperations: RoutingOperation[]): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (completedOperations.length === 0) {
      return { success: true };
    }

    if (this.config.debugMode) {
      console.log('🔄 AtomicOperationManager: Executing rollbacks for', completedOperations.length, 'operations');
    }

    const rollbackPromises = completedOperations.map(async (operation) => {
      if (!operation.rollback) {
        console.warn(`⚠️ Operation ${operation.id} has no rollback function defined`);
        return { success: true }; // Consider as successful if no rollback needed
      }

      try {
        const result = await this.executeWithTimeout(operation.rollback(), this.config.timeoutMs);
        
        if (this.config.debugMode) {
          console.log(`${result.success ? '✅' : '❌'} Rollback for ${operation.id}:`, result.success ? 'completed' : result.error);
        }

        return result;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown rollback error';
        console.error(`❌ Rollback for ${operation.id} threw exception:`, error);
        return { success: false, error: errorMsg };
      }
    });

    const rollbackResults = await Promise.all(rollbackPromises);
    const failedRollbacks = rollbackResults.filter(result => !result.success);

    if (failedRollbacks.length > 0) {
      return {
        success: false,
        error: `${failedRollbacks.length} rollbacks failed: ${failedRollbacks.map(r => r.error).join(', ')}`
      };
    }

    if (this.config.debugMode) {
      console.log('✅ AtomicOperationManager: All rollbacks completed successfully');
    }

    return { success: true };
  }

  /**
   * Execute operation with timeout protection
   * Rule 1: Webby - uses native Promise patterns
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Generate unique routing ID for tracking
   */
  private generateRoutingId(): string {
    return `routing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration at runtime
   * Rule 8: No hardcoding - runtime reconfiguration support
   */
  updateConfig(newConfig: RoutingConfig): void {
    this.config = newConfig;
    
    if (this.config.debugMode) {
      console.log('🔧 AtomicOperationManager: Configuration updated', {
        atomicOperations: this.config.atomicOperations,
        rollbackOnFailure: this.config.rollbackOnFailure,
        maxRetries: this.config.maxRetries,
        timeoutMs: this.config.timeoutMs
      });
    }
  }
}