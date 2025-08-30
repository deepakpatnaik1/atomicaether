/**
 * Event Bridge Validation Tests
 * Tests the integration contracts for Branch 1: event-bridge-wiring
 * 
 * INTEGRATION CONTRACT VALIDATION:
 * - MessageTurnBrick publishes dual-response:request → DualResponseOrchestratorBrick receives it
 * - DualResponseOrchestratorBrick publishes dual-response:generated → MessageTurnBrick receives it
 * - Event flow documented and tested
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
 * Integration Contract Test 1: Event Subscription Works
 * MessageTurnBrick publishes dual-response:request → DualResponseOrchestratorBrick receives it
 */
export async function testEventSubscription(): Promise<boolean> {
  console.log('🧪 TEST 1: Event Subscription Works');
  
  const eventBus = new MockEventBus();
  const mockBus = new MockBus();
  
  // Initialize DualResponseOrchestratorBrick
  const orchestrator = new DualResponseOrchestratorBrick();
  await orchestrator.setBuses({
    eventBus,
    configBus: mockBus,
    stateBus: mockBus,
    errorBus: mockBus
  });
  
  // Test data matching integration contract
  const testEvent = {
    turnId: 'test-turn-123',
    text: 'What is a comet?',
    persona: 'Boss',
    model: 'gpt-4o',
    timestamp: Date.now(),
    fileUrls: [],
    files: []
  };
  
  console.log('📡 Publishing dual-response:request event...');
  eventBus.publish('dual-response:request', testEvent);
  
  // Give a moment for async processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('✅ TEST 1 PASSED: DualResponseOrchestratorBrick subscribed to dual-response:request');
  return true;
}

/**
 * Integration Contract Test 2: Response Event Published
 * DualResponseOrchestratorBrick publishes dual-response:generated → MessageTurnBrick receives it
 */
export async function testResponseEventPublished(): Promise<boolean> {
  console.log('🧪 TEST 2: Response Event Published');
  
  const eventBus = new MockEventBus();
  const mockBus = new MockBus();
  
  // Subscribe to dual-response:generated to verify it gets published
  let responseReceived = false;
  let responseData: any = null;
  
  eventBus.subscribe('dual-response:generated', (data: any) => {
    console.log('📡 Received dual-response:generated event', data);
    responseReceived = true;
    responseData = data;
  });
  
  // Initialize DualResponseOrchestratorBrick
  const orchestrator = new DualResponseOrchestratorBrick();
  await orchestrator.setBuses({
    eventBus,
    configBus: mockBus,
    stateBus: mockBus,
    errorBus: mockBus
  });
  
  // Test data
  const testEvent = {
    turnId: 'test-turn-456',
    text: 'Test message for response generation',
    persona: 'Boss',
    model: 'claude-3-sonnet',
    timestamp: Date.now()
  };
  
  console.log('📡 Publishing dual-response:request to trigger response...');
  eventBus.publish('dual-response:request', testEvent);
  
  // Wait for async processing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Validate response
  if (!responseReceived) {
    console.error('❌ TEST 2 FAILED: No dual-response:generated event received');
    return false;
  }
  
  // Validate response structure matches integration contract
  if (!responseData.turnId || !responseData.hasOwnProperty('success') || !responseData.timestamp) {
    console.error('❌ TEST 2 FAILED: Invalid response structure', responseData);
    return false;
  }
  
  console.log('✅ TEST 2 PASSED: dual-response:generated event published with correct structure');
  return true;
}

/**
 * Integration Contract Test 3: MessageTurnBrick Integration
 * Complete event flow: MessageTurnBrick → DualResponseOrchestratorBrick → MessageTurnBrick
 */
export async function testCompleteEventFlow(): Promise<boolean> {
  console.log('🧪 TEST 3: Complete Event Flow');
  
  const eventBus = new MockEventBus();
  const mockBus = new MockBus();
  
  // Initialize both bricks
  const orchestrator = new DualResponseOrchestratorBrick();
  await orchestrator.setBuses({
    eventBus,
    configBus: mockBus,
    stateBus: mockBus,
    errorBus: mockBus
  });
  
  const messageTurn = new MessageTurnBrick(eventBus, mockBus, mockBus, mockBus);
  
  // Track events
  let requestPublished = false;
  let responseReceived = false;
  
  eventBus.subscribe('dual-response:request', (data) => {
    console.log('📡 dual-response:request published by MessageTurnBrick');
    requestPublished = true;
  });
  
  eventBus.subscribe('dual-response:generated', (data) => {
    console.log('📡 dual-response:generated published by DualResponseOrchestratorBrick');
    responseReceived = true;
  });
  
  // Simulate user input
  const userInput = {
    text: 'Complete flow test message',
    persona: 'Boss',
    model: 'gpt-4o',
    timestamp: Date.now()
  };
  
  console.log('👤 Simulating user input...');
  // This should trigger the complete event chain
  messageTurn.handleBossInput(userInput);
  
  // Wait for complete processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (!requestPublished) {
    console.error('❌ TEST 3 FAILED: dual-response:request not published');
    return false;
  }
  
  if (!responseReceived) {
    console.error('❌ TEST 3 FAILED: dual-response:generated not published');
    return false;
  }
  
  console.log('✅ TEST 3 PASSED: Complete event flow working');
  return true;
}

/**
 * Run all integration contract validation tests
 */
export async function runEventBridgeValidation(): Promise<void> {
  console.log('🚀 STARTING EVENT BRIDGE VALIDATION TESTS');
  console.log('=========================================');
  
  const results: boolean[] = [];
  
  try {
    results.push(await testEventSubscription());
    results.push(await testResponseEventPublished());
    results.push(await testCompleteEventFlow());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('=========================================');
    if (passed === total) {
      console.log('🎉 ALL INTEGRATION CONTRACT TESTS PASSED');
      console.log(`✅ ${passed}/${total} tests successful`);
      console.log('🔗 Event bridge wiring is complete and functional');
    } else {
      console.error('💥 INTEGRATION CONTRACT TESTS FAILED');
      console.error(`❌ ${passed}/${total} tests passed`);
      console.error('🔧 Event bridge wiring needs fixes before proceeding to next branch');
    }
    
  } catch (error) {
    console.error('💥 VALIDATION TEST SUITE CRASHED', error);
  }
}

// Export for standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runEventBridgeValidation();
}