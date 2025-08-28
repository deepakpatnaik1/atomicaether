/**
 * SynchronizedDeletionBrick Integration Tests
 * 
 * Following Essential Boss Rules:
 * - Rule 4: LEGO Bricks - Test single responsibility
 * - Rule 2: Four Buses - Test bus integration patterns
 * - Rule 9: Debug with Discipline - Comprehensive test coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SynchronizedDeletionBrick } from './SynchronizedDeletionBrick';

// Mock bus implementations
class MockEventBus {
  private listeners = new Map<string, Function[]>();
  
  subscribe(event: string, handler: Function): Function {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }
  
  publish(event: string, data: any): void {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}

class MockConfigBus {
  private configs = new Map<string, any>();
  
  async load<T>(key: string): Promise<T | null> {
    return this.configs.get(key) || null;
  }
  
  setConfig(key: string, config: any): void {
    this.configs.set(key, config);
  }
}

class MockStateBus {
  private state = new Map<string, any>();
  
  set(key: string, value: any): void {
    this.state.set(key, value);
  }
  
  get(key: string): any {
    return this.state.get(key);
  }
}

class MockErrorBus {
  public errors: Array<{ error: Error; source: string; fatal: boolean }> = [];
  
  report(error: Error, source: string, fatal: boolean = false): void {
    this.errors.push({ error, source, fatal });
  }
}

// Mock storage bricks
class MockStorageBrick {
  public deletedTurns: string[] = [];
  public shouldFail: boolean = false;
  
  async deleteTurn(turnId: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error(`Mock deletion failure for ${turnId}`);
    }
    this.deletedTurns.push(turnId);
  }
  
  async restoreTurn(turnId: string): Promise<void> {
    const index = this.deletedTurns.indexOf(turnId);
    if (index > -1) {
      this.deletedTurns.splice(index, 1);
    }
  }
}

describe('SynchronizedDeletionBrick', () => {
  let eventBus: MockEventBus;
  let configBus: MockConfigBus;
  let stateBus: MockStateBus;
  let errorBus: MockErrorBus;
  let deletionBrick: SynchronizedDeletionBrick;
  let superJournalBrick: MockStorageBrick;
  let journalBrick: MockStorageBrick;

  beforeEach(async () => {
    // Create mock buses
    eventBus = new MockEventBus();
    configBus = new MockConfigBus();
    stateBus = new MockStateBus();
    errorBus = new MockErrorBus();
    
    // Create mock storage bricks
    superJournalBrick = new MockStorageBrick();
    journalBrick = new MockStorageBrick();
    
    // Set default configuration
    configBus.setConfig('SynchronizedDeletionBrick', {
      enableSynchronizedDeletion: true,
      atomicOperations: true,
      rollbackOnFailure: true,
      maxRetries: 2,
      retryDelayMs: 100,
      timeoutMs: 5000,
      deletionTargets: {
        normalResponse: 'SuperJournalBrick',
        machineTrim: 'JournalBrick'
      },
      debugMode: true
    });
    
    // Create and initialize brick
    deletionBrick = new SynchronizedDeletionBrick(
      eventBus as any,
      configBus as any, 
      stateBus as any,
      errorBus as any
    );
    
    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Set storage bricks
    deletionBrick.setStorageBricks(superJournalBrick, journalBrick);
  });

  afterEach(() => {
    if (deletionBrick) {
      deletionBrick.destroy();
    }
  });

  it('should initialize correctly with configuration', () => {
    expect(stateBus.get('synchronized-deletion:initialized')).toBe(true);
    expect(deletionBrick.ready).toBe(true);
    expect(deletionBrick.configuration).toBeTruthy();
  });

  it('should successfully delete from both storage systems', async () => {
    // Arrange
    const turnId = 'test-turn-123';
    let deletionStarted = false;
    let deletionCompleted = false;
    
    eventBus.subscribe('deletion:started', () => { deletionStarted = true; });
    eventBus.subscribe('deletion:complete', () => { deletionCompleted = true; });
    
    // Act
    eventBus.publish('turn:delete:request', {
      turnId,
      requestedBy: 'test-user',
      reason: 'test deletion'
    });
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Assert
    expect(deletionStarted).toBe(true);
    expect(deletionCompleted).toBe(true);
    expect(superJournalBrick.deletedTurns).toContain(turnId);
    expect(journalBrick.deletedTurns).toContain(turnId);
    
    const stats = deletionBrick.statistics;
    expect(stats.totalDeletions).toBe(1);
    expect(stats.successfulDeletions).toBe(1);
    expect(stats.failedDeletions).toBe(0);
  });

  it('should rollback on partial failure with atomic operations', async () => {
    // Arrange
    const turnId = 'test-turn-456';
    journalBrick.shouldFail = true; // Make second operation fail
    
    let deletionError = false;
    eventBus.subscribe('deletion:error', () => { deletionError = true; });
    
    // Act
    eventBus.publish('turn:delete:request', {
      turnId,
      requestedBy: 'test-user'
    });
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Assert
    expect(deletionError).toBe(true);
    expect(superJournalBrick.deletedTurns).not.toContain(turnId); // Should be rolled back
    expect(journalBrick.deletedTurns).not.toContain(turnId); // Failed
    
    const stats = deletionBrick.statistics;
    expect(stats.failedDeletions).toBe(1);
    expect(stats.rollbacksRequired).toBe(1);
  });

  it('should handle non-atomic operations with partial success', async () => {
    // Arrange
    await deletionBrick.updateConfiguration({ atomicOperations: false });
    
    const turnId = 'test-turn-789';
    journalBrick.shouldFail = true; // Make second operation fail
    
    // Act
    eventBus.publish('turn:delete:request', {
      turnId,
      requestedBy: 'test-user'
    });
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Assert - First operation should succeed, second should fail
    expect(superJournalBrick.deletedTurns).toContain(turnId); // Succeeded
    expect(journalBrick.deletedTurns).not.toContain(turnId); // Failed
    
    const stats = deletionBrick.statistics;
    expect(stats.failedDeletions).toBe(1); // Overall operation failed
  });

  it('should respect retry configuration', async () => {
    // Arrange
    const turnId = 'test-turn-retry';
    let attemptCount = 0;
    
    // Make both storage bricks fail initially
    superJournalBrick.shouldFail = true;
    journalBrick.shouldFail = true;
    
    // Override deleteTurn to count attempts
    const originalDelete = superJournalBrick.deleteTurn.bind(superJournalBrick);
    superJournalBrick.deleteTurn = async (id: string) => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error('Simulated failure');
      }
      // Succeed on second attempt
      superJournalBrick.shouldFail = false;
      journalBrick.shouldFail = false;
      return originalDelete(id);
    };
    
    // Act
    eventBus.publish('turn:delete:request', {
      turnId,
      requestedBy: 'test-user'
    });
    
    // Wait for retry operations
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Assert
    expect(attemptCount).toBeGreaterThan(1);
    const stats = deletionBrick.statistics;
    expect(stats.successfulDeletions).toBe(1); // Should eventually succeed
  });

  it('should disable operations when configuration is disabled', async () => {
    // Arrange
    configBus.setConfig('SynchronizedDeletionBrick', {
      enableSynchronizedDeletion: false
    });
    
    // Recreate brick with disabled config
    deletionBrick.destroy();
    deletionBrick = new SynchronizedDeletionBrick(
      eventBus as any,
      configBus as any,
      stateBus as any,
      errorBus as any
    );
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const turnId = 'test-turn-disabled';
    
    // Act
    eventBus.publish('turn:delete:request', {
      turnId,
      requestedBy: 'test-user'
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Assert - No operations should occur
    expect(superJournalBrick.deletedTurns).not.toContain(turnId);
    expect(journalBrick.deletedTurns).not.toContain(turnId);
    expect(deletionBrick.ready).toBe(false);
  });

  it('should handle graceful shutdown', () => {
    // Act
    deletionBrick.destroy();
    
    // Assert
    expect(stateBus.get('synchronized-deletion:initialized')).toBe(false);
    expect(deletionBrick.ready).toBe(false);
  });

  it('should track deletion statistics correctly', async () => {
    // Arrange
    const turnIds = ['turn-1', 'turn-2', 'turn-3'];
    journalBrick.shouldFail = true; // Make some operations fail
    
    // Act - Process multiple deletions
    for (const turnId of turnIds) {
      eventBus.publish('turn:delete:request', {
        turnId,
        requestedBy: 'test-user'
      });
      
      // Wait between operations
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Final wait for completion
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Assert
    const stats = deletionBrick.statistics;
    expect(stats.totalDeletions).toBe(3);
    expect(stats.failedDeletions).toBe(3); // All should fail due to journalBrick failure
    expect(stats.rollbacksRequired).toBe(3); // All should require rollback
    expect(stats.averageDeletionTimeMs).toBeGreaterThan(0);
  });
});