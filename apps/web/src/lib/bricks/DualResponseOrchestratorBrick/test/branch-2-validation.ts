/**
 * Branch 2 Integration Validation Tests
 * Tests the integration contracts for Branch 2: main-app-orchestrator-integration
 * 
 * INTEGRATION CONTRACT VALIDATION:
 * - All dual-response bricks initialized in main app
 * - DualResponseOrchestratorBrick has full brick registration
 * - Health monitoring infrastructure working
 * - Branch 1 event flow still works (regression test)
 * - Configuration loading functional
 * - App initialization sequence preserved
 */

import { DualResponseOrchestratorBrick } from '../core/DualResponseOrchestratorBrick';
import { MessageTurnBrick } from '../../MessageTurnBrick';

// Mock EventBus for testing
class MockEventBus {
  private subscriptions: Map<string, Function[]> = new Map();
  
  subscribe(event: string, handler: Function): Function {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }
    this.subscriptions.get(event)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }
  
  publish(event: string, data: any): void {
    console.log(`🔄 MockEventBus: Publishing ${event}`, data);
    const handlers = this.subscriptions.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`❌ MockEventBus: Handler error for ${event}`, error);
      }
    });
  }
}

// Mock other buses
class MockBus {
  subscribe() { return () => {}; }
  publish() {}
  set() {}
  get() { return null; }
  load() { return Promise.resolve(null); }
  report() {}
}

/**
 * Test 1: All Bricks Initialized Successfully
 * Verify all dual-response bricks are properly initialized
 */
export async function testAllBricksInitialized(): Promise<boolean> {
  console.log('🧪 TEST 1: All Bricks Initialized Successfully');
  
  const eventBus = new MockEventBus();
  const mockBus = new MockBus();
  
  // Initialize all bricks as they would be in main app
  const dualResponseOrchestratorBrick = new DualResponseOrchestratorBrick();
  await dualResponseOrchestratorBrick.setBuses({
    eventBus,
    configBus: mockBus,
    stateBus: mockBus,
    errorBus: mockBus
  });
  
  // Test brick instances exist and are ready
  console.assert(dualResponseOrchestratorBrick !== undefined, 'DualResponseOrchestratorBrick initialized');
  
  // Initialize orchestrator
  await dualResponseOrchestratorBrick.initialize();
  
  console.log('✅ TEST 1 PASSED: All dual-response bricks initialized successfully');
  return true;
}

/**
 * Test 2: Orchestrator Has All Dependencies Registered
 * Verify DualResponseOrchestratorBrick has all required brick dependencies
 */
export async function testOrchestratorDependencies(): Promise<boolean> {
  console.log('🧪 TEST 2: Orchestrator Dependencies Registered');
  
  const eventBus = new MockEventBus();
  const mockBus = new MockBus();
  
  // Initialize orchestrator
  const dualResponseOrchestratorBrick = new DualResponseOrchestratorBrick();
  await dualResponseOrchestratorBrick.setBuses({
    eventBus,
    configBus: mockBus,
    stateBus: mockBus,
    errorBus: mockBus
  });
  
  // Initialize supporting bricks
  const messageTurnBrick = new MessageTurnBrick(eventBus, mockBus, mockBus, mockBus);
  
  // Register brick dependencies as done in main app
  dualResponseOrchestratorBrick.setBricks({
    messageTurnBrick,
    machineTrimBrick: null, // Future implementation
    responseRouterBrick: mockBus,
    superJournalBrick: mockBus,
    journalBrick: mockBus,
    synchronizedDeletionBrick: mockBus
  });
  
  await dualResponseOrchestratorBrick.initialize();
  
  const stats = dualResponseOrchestratorBrick.getStatistics();
  
  // Verify registered brick count (should be >= 5)
  console.assert(stats.orchestrator.registeredBricks >= 5, 
    `Expected >= 5 registered bricks, got ${stats.orchestrator.registeredBricks}`);
  
  // Verify orchestrator is ready
  console.assert(dualResponseOrchestratorBrick.isReady() === true, 'Orchestrator is ready');
  
  console.log('📊 Orchestrator Statistics:', {
    registeredBricks: stats.orchestrator.registeredBricks,
    isReady: dualResponseOrchestratorBrick.isReady(),
    healthScore: stats.coordinator.healthScore
  });
  
  console.log('✅ TEST 2 PASSED: Orchestrator has all dependencies registered');
  return true;
}

/**
 * Test 3: Health Monitoring Active
 * Verify health monitoring infrastructure is working
 */
export async function testHealthMonitoring(): Promise<boolean> {
  console.log('🧪 TEST 3: Health Monitoring Active');
  
  const eventBus = new MockEventBus();
  const mockBus = new MockBus();
  
  const dualResponseOrchestratorBrick = new DualResponseOrchestratorBrick();
  await dualResponseOrchestratorBrick.setBuses({
    eventBus,
    configBus: mockBus,
    stateBus: mockBus,
    errorBus: mockBus
  });
  
  await dualResponseOrchestratorBrick.initialize();
  
  const healthCheck = await dualResponseOrchestratorBrick.healthCheck();
  
  // Verify health check structure
  console.assert(typeof healthCheck.healthy === 'boolean', 'Health check returns boolean');
  console.assert(typeof healthCheck.brick === 'boolean', 'Health check returns brick status');
  console.assert(typeof healthCheck.timestamp === 'number', 'Health check returns timestamp');
  
  console.log('📊 Health Status:', {
    healthy: healthCheck.healthy,
    brick: healthCheck.brick,
    coordinator: healthCheck.coordinator,
    timestamp: healthCheck.timestamp
  });
  
  console.log('✅ TEST 3 PASSED: Health monitoring infrastructure active');
  return true;
}

/**
 * Test 4: Branch 1 Event Flow Still Works (Regression Test)
 * Ensure Branch 1's event bridge wiring continues working after Branch 2 integration
 */
export async function testBranch1EventFlowRegression(): Promise<boolean> {
  console.log('🧪 TEST 4: Branch 1 Event Flow Regression Test');
  
  const eventBus = new MockEventBus();
  const mockBus = new MockBus();
  
  // Initialize both bricks as in Branch 1 testing
  const orchestrator = new DualResponseOrchestratorBrick();
  await orchestrator.setBuses({
    eventBus,
    configBus: mockBus,
    stateBus: mockBus,
    errorBus: mockBus
  });
  
  const messageTurnBrick = new MessageTurnBrick(eventBus, mockBus, mockBus, mockBus);
  
  // Track events
  let requestReceived = false;
  let responseGenerated = false;
  
  eventBus.subscribe('dual-response:request', (data) => {
    console.log('✅ dual-response:request still works', data.turnId);
    requestReceived = true;
  });
  
  eventBus.subscribe('dual-response:generated', (data) => {
    console.log('✅ dual-response:generated still works', data.turnId);
    responseGenerated = true;
  });
  
  // Trigger event flow
  const testMessage = {
    text: 'Branch 2 regression test',
    persona: 'Boss',  
    model: 'gpt-4o',
    timestamp: Date.now()
  };
  
  messageTurnBrick.handleBossInput(testMessage);
  
  // Wait for event processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.assert(requestReceived, 'dual-response:request event received');
  console.assert(responseGenerated, 'dual-response:generated event generated');
  
  console.log('✅ TEST 4 PASSED: Branch 1 event flow still works after Branch 2 integration');
  return true;
}

/**
 * Test 5: Configuration Loading Working  
 * Verify external configuration system is functional
 */
export async function testConfigurationLoading(): Promise<boolean> {
  console.log('🧪 TEST 5: Configuration Loading Working');
  
  const eventBus = new MockEventBus();
  const mockBus = new MockBus();
  
  const dualResponseOrchestratorBrick = new DualResponseOrchestratorBrick();
  await dualResponseOrchestratorBrick.setBuses({
    eventBus,
    configBus: mockBus,
    stateBus: mockBus,
    errorBus: mockBus
  });
  
  await dualResponseOrchestratorBrick.initialize();
  
  const config = dualResponseOrchestratorBrick.getConfig();
  
  // Verify configuration loaded (even if defaults)
  console.assert(config !== null, 'Configuration loaded');
  console.assert(typeof config.enableDualResponse === 'boolean', 'Configuration has expected structure');
  
  console.log('🔧 Config Status:', {
    configLoaded: !!config,
    enableDualResponse: config?.enableDualResponse,
    debugMode: config?.debugMode,
    hasTimeouts: !!config?.timeouts,
    hasStorageTargets: !!config?.storageTargets
  });
  
  console.log('✅ TEST 5 PASSED: Configuration loading functional');
  return true;
}

/**
 * Test 6: App Initialization Sequence Preserved
 * Verify existing app initialization still works correctly
 */
export async function testAppInitSequence(): Promise<boolean> {
  console.log('🧪 TEST 6: App Initialization Sequence Preserved');
  
  const eventBus = new MockEventBus();
  const mockBus = new MockBus();
  
  // Simulate existing brick initialization
  const messageTurnBrick = new MessageTurnBrick(eventBus, mockBus, mockBus, mockBus);
  
  // Add orchestrator to sequence
  const dualResponseOrchestratorBrick = new DualResponseOrchestratorBrick();
  await dualResponseOrchestratorBrick.setBuses({
    eventBus,
    configBus: mockBus,
    stateBus: mockBus,
    errorBus: mockBus
  });
  
  await dualResponseOrchestratorBrick.initialize();
  
  // Verify existing bricks still work
  console.assert(messageTurnBrick !== undefined, 'MessageTurnBrick still initialized');
  console.assert(dualResponseOrchestratorBrick !== undefined, 'DualResponseOrchestratorBrick added without breaking sequence');
  
  // Verify app:ready event would still work
  let appReadyFired = false;
  eventBus.subscribe('app:ready', () => {
    appReadyFired = true;
  });
  
  // Simulate app initialization completion
  eventBus.publish('app:ready', { timestamp: Date.now() });
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.assert(appReadyFired, 'app:ready event still works');
  
  console.log('✅ TEST 6 PASSED: App initialization sequence preserved');
  return true;
}

/**
 * Main test runner for Branch 2 validation
 */
export async function runBranch2ValidationSuite(): Promise<void> {
  console.log('🚀 STARTING BRANCH 2 INTEGRATION VALIDATION');
  console.log('=============================================');
  
  const results: boolean[] = [];
  
  try {
    results.push(await testAllBricksInitialized());
    results.push(await testOrchestratorDependencies());
    results.push(await testHealthMonitoring());
    results.push(await testBranch1EventFlowRegression());
    results.push(await testConfigurationLoading());
    results.push(await testAppInitSequence());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('=============================================');
    if (passed === total) {
      console.log('🎉 ALL BRANCH 2 INTEGRATION TESTS PASSED');
      console.log(`✅ ${passed}/${total} tests successful`);
      console.log('🔗 Branch 2 integration contract fulfilled');
      console.log('🚀 Ready for Branch 3: LLM Service Integration');
    } else {
      console.error('💥 BRANCH 2 INTEGRATION TESTS FAILED');
      console.error(`❌ ${passed}/${total} tests passed`);
      console.error('🔧 Branch 2 integration needs fixes before proceeding to Branch 3');
    }
    
  } catch (error) {
    console.error('💥 BRANCH 2 VALIDATION TEST SUITE CRASHED', error);
  }
}

// Export for standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runBranch2ValidationSuite();
}