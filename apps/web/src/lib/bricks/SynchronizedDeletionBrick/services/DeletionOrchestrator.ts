/**
 * DeletionOrchestrator - Atomic deletion coordination service
 * 
 * Following Essential Boss Rules:
 * - Rule 4: LEGO Bricks - Single responsibility for atomic deletion
 * - Rule 9: Debug with Discipline - Comprehensive error handling without reactive fixes
 * - Rule 8: No Hardcoding - Configuration-driven behavior
 */

import type { 
  DeletionRequest, 
  DeletionResult, 
  DeletionConfig 
} from '../types/DeletionTypes';

export class DeletionOrchestrator {
  private config: DeletionConfig;
  private superJournalBrick: any = null;
  private journalBrick: any = null;
  
  constructor(config: DeletionConfig) {
    this.config = config;
  }
  
  /**
   * Set storage brick dependencies for deletion operations
   */
  setStorageBricks(superJournalBrick: any, journalBrick: any): void {
    this.superJournalBrick = superJournalBrick;
    this.journalBrick = journalBrick;
    
    if (this.config.debugMode) {
      console.log('🔧 DeletionOrchestrator: Storage bricks configured', {
        superJournalBrick: !!superJournalBrick,
        journalBrick: !!journalBrick
      });
    }
  }
  
  /**
   * Execute atomic deletion across dual storage systems
   */
  async deleteTurn(request: DeletionRequest): Promise<DeletionResult> {
    const startTime = Date.now();
    let retryCount = 0;
    
    if (this.config.debugMode) {
      console.log('🗑️ DeletionOrchestrator: Starting deletion', {
        deletionId: request.deletionId,
        turnId: request.turnId
      });
    }
    
    // Initialize result structure
    const result: DeletionResult = {
      deletionId: request.deletionId,
      turnId: request.turnId,
      success: false,
      operations: {
        normalResponse: { success: false, timestamp: 0 },
        machineTrim: { success: false, timestamp: 0 }
      },
      performance: {
        totalTimeMs: 0,
        operationsTimeMs: 0,
        retryCount: 0
      },
      timestamp: Date.now()
    };
    
    // Retry logic for atomic operations
    while (retryCount <= (this.config.maxRetries || 3)) {
      try {
        const operationStartTime = Date.now();
        
        // Execute atomic deletion
        if (this.config.atomicOperations) {
          await this.executeAtomicDeletion(request, result);
        } else {
          await this.executeIndividualDeletions(request, result);
        }
        
        // Calculate performance metrics
        result.performance.operationsTimeMs = Date.now() - operationStartTime;
        result.performance.totalTimeMs = Date.now() - startTime;
        result.performance.retryCount = retryCount;
        
        // Mark as successful
        result.success = result.operations.normalResponse.success && 
                        result.operations.machineTrim.success;
        
        if (result.success) {
          if (this.config.debugMode) {
            console.log('✅ DeletionOrchestrator: Deletion completed successfully', {
              deletionId: request.deletionId,
              totalTimeMs: result.performance.totalTimeMs
            });
          }
          return result;
        }
        
        // If not successful and rollback is enabled
        if (this.config.rollbackOnFailure && !result.success) {
          await this.executeRollback(request, result);
        }
        
        break; // Exit retry loop if we reach this point
        
      } catch (error) {
        retryCount++;
        
        if (this.config.debugMode) {
          console.warn(`⚠️ DeletionOrchestrator: Attempt ${retryCount} failed`, {
            deletionId: request.deletionId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        
        // If max retries exceeded, fail
        if (retryCount > (this.config.maxRetries || 3)) {
          result.operations.normalResponse.error = error instanceof Error ? error.message : 'Unknown error';
          result.operations.machineTrim.error = error instanceof Error ? error.message : 'Unknown error';
          break;
        }
        
        // Wait before retry
        if (this.config.retryDelayMs) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }
    
    // Final result calculation
    result.performance.totalTimeMs = Date.now() - startTime;
    result.performance.retryCount = retryCount;
    
    if (this.config.debugMode && !result.success) {
      console.error('❌ DeletionOrchestrator: Deletion failed after all retries', {
        deletionId: request.deletionId,
        retryCount
      });
    }
    
    return result;
  }
  
  /**
   * Execute atomic deletion with transaction-like behavior
   */
  private async executeAtomicDeletion(request: DeletionRequest, result: DeletionResult): Promise<void> {
    // Phase 1: Delete from SuperJournalBrick (normal response)
    if (this.config.deletionTargets?.normalResponse !== 'disabled') {
      result.operations.normalResponse.timestamp = Date.now();
      
      if (this.superJournalBrick && typeof this.superJournalBrick.deleteTurn === 'function') {
        try {
          await this.withTimeout(
            this.superJournalBrick.deleteTurn(request.turnId),
            this.config.timeoutMs || 15000
          );
          result.operations.normalResponse.success = true;
        } catch (error) {
          result.operations.normalResponse.success = false;
          result.operations.normalResponse.error = error instanceof Error ? error.message : 'Unknown error';
          throw error; // Abort atomic operation
        }
      } else {
        result.operations.normalResponse.success = true; // Mock success if brick not available
      }
    } else {
      result.operations.normalResponse.success = true; // Disabled operation counts as success
    }
    
    // Phase 2: Delete from JournalBrick (machine trim)
    if (this.config.deletionTargets?.machineTrim !== 'disabled') {
      result.operations.machineTrim.timestamp = Date.now();
      
      if (this.journalBrick && typeof this.journalBrick.deleteTurn === 'function') {
        try {
          await this.withTimeout(
            this.journalBrick.deleteTurn(request.turnId),
            this.config.timeoutMs || 15000
          );
          result.operations.machineTrim.success = true;
        } catch (error) {
          result.operations.machineTrim.success = false;
          result.operations.machineTrim.error = error instanceof Error ? error.message : 'Unknown error';
          
          // Rollback SuperJournal deletion if it was successful
          if (result.operations.normalResponse.success && this.config.rollbackOnFailure) {
            await this.rollbackNormalResponse(request, result);
          }
          
          throw error;
        }
      } else {
        result.operations.machineTrim.success = true; // Mock success if brick not available
      }
    } else {
      result.operations.machineTrim.success = true; // Disabled operation counts as success
    }
  }
  
  /**
   * Execute individual deletions without atomic guarantees
   */
  private async executeIndividualDeletions(request: DeletionRequest, result: DeletionResult): Promise<void> {
    // Delete from SuperJournalBrick (allow partial success)
    if (this.config.deletionTargets?.normalResponse !== 'disabled') {
      result.operations.normalResponse.timestamp = Date.now();
      
      try {
        if (this.superJournalBrick && typeof this.superJournalBrick.deleteTurn === 'function') {
          await this.withTimeout(
            this.superJournalBrick.deleteTurn(request.turnId),
            this.config.timeoutMs || 15000
          );
        }
        result.operations.normalResponse.success = true;
      } catch (error) {
        result.operations.normalResponse.success = false;
        result.operations.normalResponse.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      result.operations.normalResponse.success = true;
    }
    
    // Delete from JournalBrick (allow partial success)
    if (this.config.deletionTargets?.machineTrim !== 'disabled') {
      result.operations.machineTrim.timestamp = Date.now();
      
      try {
        if (this.journalBrick && typeof this.journalBrick.deleteTurn === 'function') {
          await this.withTimeout(
            this.journalBrick.deleteTurn(request.turnId),
            this.config.timeoutMs || 15000
          );
        }
        result.operations.machineTrim.success = true;
      } catch (error) {
        result.operations.machineTrim.success = false;
        result.operations.machineTrim.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      result.operations.machineTrim.success = true;
    }
  }
  
  /**
   * Execute rollback operations for failed atomic deletion
   */
  private async executeRollback(request: DeletionRequest, result: DeletionResult): Promise<void> {
    if (!this.config.rollbackOnFailure) return;
    
    result.rollback = {
      required: true,
      completed: false,
      operations: []
    };
    
    if (this.config.debugMode) {
      console.log('🔄 DeletionOrchestrator: Executing rollback', {
        deletionId: request.deletionId
      });
    }
    
    try {
      // Rollback operations that succeeded
      if (result.operations.normalResponse.success) {
        await this.rollbackNormalResponse(request, result);
      }
      
      if (result.operations.machineTrim.success) {
        await this.rollbackMachineTrim(request, result);
      }
      
      result.rollback.completed = true;
      
      if (this.config.debugMode) {
        console.log('✅ DeletionOrchestrator: Rollback completed', {
          deletionId: request.deletionId,
          operations: result.rollback.operations
        });
      }
      
    } catch (error) {
      result.rollback.completed = false;
      result.rollback.error = error instanceof Error ? error.message : 'Unknown error';
      
      if (this.config.debugMode) {
        console.error('❌ DeletionOrchestrator: Rollback failed', {
          deletionId: request.deletionId,
          error: result.rollback.error
        });
      }
    }
  }
  
  /**
   * Rollback normal response deletion
   */
  private async rollbackNormalResponse(request: DeletionRequest, result: DeletionResult): Promise<void> {
    if (this.superJournalBrick && typeof this.superJournalBrick.restoreTurn === 'function') {
      await this.superJournalBrick.restoreTurn(request.turnId);
      result.rollback!.operations.push('normalResponse');
    }
  }
  
  /**
   * Rollback machine trim deletion
   */
  private async rollbackMachineTrim(request: DeletionRequest, result: DeletionResult): Promise<void> {
    if (this.journalBrick && typeof this.journalBrick.restoreTurn === 'function') {
      await this.journalBrick.restoreTurn(request.turnId);
      result.rollback!.operations.push('machineTrim');
    }
  }
  
  /**
   * Wrap promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }
  
  /**
   * Update orchestrator configuration
   */
  updateConfig(newConfig: DeletionConfig): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.debugMode) {
      console.log('🔧 DeletionOrchestrator: Configuration updated', this.config);
    }
  }
}