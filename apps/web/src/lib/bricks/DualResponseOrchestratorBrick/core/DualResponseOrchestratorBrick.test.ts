/**
 * DualResponseOrchestratorBrick Test Suite
 * 
 * Following Rule 1: Build first, test relentlessly
 * Field report learnings applied for comprehensive testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DualResponseOrchestratorBrick } from './DualResponseOrchestratorBrick';
import type { WorkflowConfig } from '../types/OrchestratorTypes';

describe('DualResponseOrchestratorBrick', () => {
  let orchestratorBrick: DualResponseOrchestratorBrick;
  let mockBuses: any;
  let mockBricks: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock fetch for configuration loading
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
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
        debugMode: true
      })
    });

    // Create fresh orchestrator brick
    orchestratorBrick = new DualResponseOrchestratorBrick();

    // Mock bus implementations
    mockBuses = {
      eventBus: {
        publish: vi.fn(),
        subscribe: vi.fn()
      },
      configBus: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn()
      },
      stateBus: {
        publish: vi.fn()
      },
      errorBus: {
        publish: vi.fn()
      }
    };

    // Mock brick implementations
    mockBricks = {
      messageTurnBrick: {
        createTurn: vi.fn().mockResolvedValue({
          turnId: 'test_turn_123',
          messageId: 'test_msg_123',
          success: true
        }),
        getTurn: vi.fn(),
        updateTurn: vi.fn()
      },
      machineTrimBrick: {
        trimResponse: vi.fn().mockResolvedValue({
          trimId: 'test_trim_123',
          originalLength: 1000,
          trimmedLength: 500,
          success: true
        }),
        getTrimResult: vi.fn()
      },
      responseRouterBrick: {
        routeResponse: vi.fn().mockResolvedValue({
          routingId: 'test_route_123',
          selectedRoute: 'dual_storage',
          success: true
        }),
        getRoute: vi.fn()
      },
      superJournalBrick: {
        saveTurn: vi.fn().mockResolvedValue({
          success: true,
          reference: 'superjournal_ref_123'
        }),
        getTurn: vi.fn(),
        deleteTurn: vi.fn().mockResolvedValue({ success: true })
      },
      journalBrick: {
        saveTurn: vi.fn().mockResolvedValue({
          success: true,
          reference: 'journal_ref_123'
        }),
        getTurn: vi.fn(),
        deleteTurn: vi.fn().mockResolvedValue({ success: true })
      },
      synchronizedDeletionBrick: {
        deleteTurn: vi.fn().mockResolvedValue({
          success: true,
          deletionId: 'test_deletion_123'
        }),
        getStats: vi.fn().mockReturnValue({
          totalDeletions: 5,
          successfulDeletions: 5,
          failedDeletions: 0
        })
      }
    };
  });

  afterEach(async () => {
    // Cleanup
    if (orchestratorBrick.isReady()) {
      await orchestratorBrick.destroy();
    }
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with external configuration', async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      
      await orchestratorBrick.initialize();
      
      expect(orchestratorBrick.isReady()).toBe(true);
      expect(mockBuses.eventBus.publish).toHaveBeenCalledWith(
        'orchestrator:initialized',
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });

    it('should fallback to default configuration when external config fails', async () => {
      // Mock fetch failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Config not found'));
      
      const newOrchestrator = new DualResponseOrchestratorBrick();
      newOrchestrator.setBuses(mockBuses);
      newOrchestrator.setBricks(mockBricks);
      
      await newOrchestrator.initialize();
      
      expect(newOrchestrator.isReady()).toBe(true);
      
      const config = newOrchestrator.getConfig();
      expect(config?.enableDualResponse).toBe(true);
      expect(config?.debugMode).toBe(false); // Default value
      
      await newOrchestrator.destroy();
    });

    it('should handle configuration updates', async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
      
      const newConfig = { debugMode: false, enableMachineTrim: false };
      orchestratorBrick.updateConfig(newConfig);
      
      const config = orchestratorBrick.getConfig();
      expect(config?.debugMode).toBe(false);
      expect(config?.enableMachineTrim).toBe(false);
      
      expect(mockBuses.eventBus.publish).toHaveBeenCalledWith(
        'orchestrator:config:updated',
        expect.objectContaining({
          config: expect.any(Object),
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Message Processing Workflow', () => {
    beforeEach(async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
    });

    it('should process complete dual-response workflow successfully', async () => {
      const testMessage = 'Test user message for dual response processing';
      const metadata = { userId: 'test_user', sessionId: 'test_session' };
      
      const result = await orchestratorBrick.processMessage(testMessage, metadata);
      
      expect(result.success).toBe(true);
      expect(result.workflowId).toBeDefined();
      expect(result.outputs.turnId).toBe('test_turn_123');
      expect(result.performance.totalDuration).toBeGreaterThan(0);
      
      // Verify all stages were called
      expect(mockBricks.messageTurnBrick.createTurn).toHaveBeenCalledWith(testMessage, metadata);
      expect(mockBricks.machineTrimBrick.trimResponse).toHaveBeenCalled();
      expect(mockBricks.responseRouterBrick.routeResponse).toHaveBeenCalled();
      expect(mockBricks.superJournalBrick.saveTurn).toHaveBeenCalled();
      expect(mockBricks.journalBrick.saveTurn).toHaveBeenCalled();
      
      // Check StateBus was updated
      expect(mockBuses.stateBus.publish).toHaveBeenCalledWith(
        'orchestrator:processing',
        expect.objectContaining({
          type: 'message:processed',
          success: true
        })
      );
    });

    it('should handle partial workflow failures gracefully', async () => {
      // Make machine trim fail
      mockBricks.machineTrimBrick.trimResponse.mockRejectedValue(new Error('Machine trim failed'));
      
      const testMessage = 'Test message that will fail at machine trim';
      
      await expect(orchestratorBrick.processMessage(testMessage)).rejects.toThrow();
      
      // Verify error was reported
      expect(mockBuses.errorBus.publish).toHaveBeenCalledWith(
        'orchestrator:error',
        expect.objectContaining({
          type: 'message:processing:failed',
          error: expect.stringContaining('Machine trim failed')
        })
      );
    });

    it('should apply custom workflow configuration', async () => {
      const customConfig = {
        timeouts: { messageTurn: 10000 },
        debugMode: true
      };
      
      const result = await orchestratorBrick.processMessage(
        'Test with custom config',
        {},
        customConfig
      );
      
      expect(result.success).toBe(true);
    });

    it('should handle retry logic for failed stages', async () => {
      // Make first call fail, second succeed
      mockBricks.machineTrimBrick.trimResponse
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          trimId: 'test_trim_retry',
          originalLength: 1000,
          trimmedLength: 500,
          success: true
        });
      
      const result = await orchestratorBrick.processMessage('Test retry logic');
      
      expect(result.success).toBe(true);
      expect(mockBricks.machineTrimBrick.trimResponse).toHaveBeenCalledTimes(2);
    });
  });

  describe('Deletion Processing', () => {
    beforeEach(async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
    });

    it('should process deletion requests', async () => {
      const turnId = 'test_turn_to_delete';
      const requestedBy = 'test_user';
      const reason = 'user_requested';
      
      const result = await orchestratorBrick.processDeletion(turnId, requestedBy, reason);
      
      expect(result.success).toBe(true);
      expect(result.deletionId).toBeDefined();
      
      // Check StateBus was updated
      expect(mockBuses.stateBus.publish).toHaveBeenCalledWith(
        'orchestrator:deletion',
        expect.objectContaining({
          type: 'deletion:processed',
          turnId,
          success: true
        })
      );
    });

    it('should handle deletion failures', async () => {
      // Make deletion fail
      const mockError = new Error('Deletion failed');
      vi.spyOn(orchestratorBrick as any, 'coordinator', 'get').mockReturnValue({
        processDeletion: vi.fn().mockRejectedValue(mockError)
      });
      
      await expect(
        orchestratorBrick.processDeletion('test_turn', 'user', 'cleanup')
      ).rejects.toThrow('Deletion failed');
      
      expect(mockBuses.errorBus.publish).toHaveBeenCalledWith(
        'orchestrator:error',
        expect.objectContaining({
          type: 'deletion:processing:failed',
          error: 'Deletion failed'
        })
      );
    });
  });

  describe('Statistics and Health Monitoring', () => {
    beforeEach(async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
    });

    it('should provide comprehensive statistics', () => {
      const stats = orchestratorBrick.getStatistics();
      
      expect(stats).toHaveProperty('orchestrator');
      expect(stats).toHaveProperty('stateManager');
      expect(stats).toHaveProperty('coordinator');
      expect(stats.coordinator).toHaveProperty('isInitialized', true);
      expect(stats.coordinator).toHaveProperty('healthScore');
    });

    it('should track active workflows', async () => {
      // Start a workflow but don't wait for completion
      const workflowPromise = orchestratorBrick.processMessage('Long running test');
      
      const activeWorkflows = orchestratorBrick.getActiveWorkflows();
      expect(Array.isArray(activeWorkflows)).toBe(true);
      
      // Wait for completion
      await workflowPromise;
    });

    it('should perform health checks', async () => {
      const health = await orchestratorBrick.healthCheck();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('brick', true);
      expect(health).toHaveProperty('coordinator');
      expect(health).toHaveProperty('timestamp');
      expect(typeof health.timestamp).toBe('number');
    });
  });

  describe('Bus Integration', () => {
    it('should integrate with EventBus for workflow events', async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
      
      await orchestratorBrick.processMessage('Test EventBus integration');
      
      // Check initialization event
      expect(mockBuses.eventBus.publish).toHaveBeenCalledWith(
        'orchestrator:initialized',
        expect.any(Object)
      );
    });

    it('should integrate with ConfigBus for configuration updates', async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
      
      // Verify ConfigBus subscription
      expect(mockBuses.configBus.subscribe).toHaveBeenCalledWith(
        'DualResponseOrchestratorBrick',
        expect.any(Function)
      );
    });

    it('should integrate with StateBus for workflow state tracking', async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
      
      await orchestratorBrick.processMessage('Test StateBus integration');
      
      expect(mockBuses.stateBus.publish).toHaveBeenCalledWith(
        'orchestrator:processing',
        expect.objectContaining({
          type: 'message:processed'
        })
      );
    });

    it('should integrate with ErrorBus for error reporting', async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
      
      // Force an error
      mockBricks.messageTurnBrick.createTurn.mockRejectedValue(new Error('Test error'));
      
      await expect(
        orchestratorBrick.processMessage('Test error handling')
      ).rejects.toThrow();
      
      expect(mockBuses.errorBus.publish).toHaveBeenCalledWith(
        'orchestrator:error',
        expect.objectContaining({
          type: 'message:processing:failed',
          error: expect.any(String)
        })
      );
    });
  });

  describe('Lifecycle Management', () => {
    it('should handle proper initialization sequence', async () => {
      expect(orchestratorBrick.isReady()).toBe(false);
      
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      
      expect(orchestratorBrick.isReady()).toBe(false);
      
      await orchestratorBrick.initialize();
      
      expect(orchestratorBrick.isReady()).toBe(true);
    });

    it('should handle graceful destruction', async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
      
      expect(orchestratorBrick.isReady()).toBe(true);
      
      await orchestratorBrick.destroy();
      
      expect(orchestratorBrick.isReady()).toBe(false);
      
      // Verify cleanup events
      expect(mockBuses.eventBus.publish).toHaveBeenCalledWith(
        'orchestrator:destroyed',
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
      
      expect(mockBuses.configBus.unsubscribe).toHaveBeenCalledWith(
        'DualResponseOrchestratorBrick'
      );
    });

    it('should prevent operations after destruction', async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
      await orchestratorBrick.destroy();
      
      await expect(
        orchestratorBrick.initialize()
      ).rejects.toThrow('Cannot initialize destroyed DualResponseOrchestratorBrick');
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
    });

    it('should reload configuration from external file', async () => {
      const updatedConfig = { debugMode: true, enableMachineTrim: false };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => updatedConfig
      });
      
      await orchestratorBrick.reloadConfig();
      
      expect(mockBuses.eventBus.publish).toHaveBeenCalledWith(
        'orchestrator:config:reloaded',
        expect.objectContaining({
          config: expect.any(Object)
        })
      );
    });

    it('should maintain configuration consistency', () => {
      const originalConfig = orchestratorBrick.getConfig();
      expect(originalConfig).toBeDefined();
      
      orchestratorBrick.updateConfig({ debugMode: false });
      
      const updatedConfig = orchestratorBrick.getConfig();
      expect(updatedConfig?.debugMode).toBe(false);
      expect(updatedConfig?.enableDualResponse).toBe(originalConfig?.enableDualResponse);
    });
  });

  describe('Error Recovery and Resilience', () => {
    beforeEach(async () => {
      orchestratorBrick.setBuses(mockBuses);
      orchestratorBrick.setBricks(mockBricks);
      await orchestratorBrick.initialize();
    });

    it('should handle missing brick dependencies gracefully', async () => {
      // Remove a required brick
      orchestratorBrick.setBricks({
        ...mockBricks,
        messageTurnBrick: undefined
      });
      
      // Should still attempt to process but handle the missing brick
      await expect(
        orchestratorBrick.processMessage('Test missing brick')
      ).rejects.toThrow();
    });

    it('should handle timeout scenarios', async () => {
      // Mock a timeout scenario
      mockBricks.machineTrimBrick.trimResponse = vi.fn(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), 100)
        )
      );
      
      await expect(
        orchestratorBrick.processMessage('Test timeout')
      ).rejects.toThrow();
    });

    it('should maintain system stability during high load', async () => {
      const concurrentMessages = Array.from({ length: 10 }, (_, i) => 
        orchestratorBrick.processMessage(`Concurrent message ${i}`)
      );
      
      const results = await Promise.allSettled(concurrentMessages);
      
      // At least some should succeed
      const successes = results.filter(result => result.status === 'fulfilled');
      expect(successes.length).toBeGreaterThan(0);
    });
  });
});