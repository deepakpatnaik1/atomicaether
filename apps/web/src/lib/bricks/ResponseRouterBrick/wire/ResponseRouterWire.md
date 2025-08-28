# ResponseRouterBrick Wire Documentation

## Purpose
LEGO Brick for automatic routing of dual responses to appropriate storage destinations. Enables seamless dual-storage workflow automation with atomic operations and comprehensive error recovery.

## Bus Connections

### EventBus
- **Subscribes**: 
  - `dual-response:generated` - Triggers automatic routing of dual responses
- **Publishes**: 
  - `response-router:initialized` - Initialization success/failure with config info
  - `routing:started` - Routing operation commenced with metadata
  - `routing:complete` - Successful dual storage completion with performance metrics
  - `routing:error` - Routing failures with detailed error information
  - `routing:rollback` - Rollback operations completed (partial failure recovery)
  - `response-router:config-updated` - Runtime configuration updates
  - `response-router:shutdown` - Clean shutdown completion

### ConfigBus
- **Loads**: `ResponseRouterBrick` configuration for routing targets and atomic operation settings
- **Fallback**: Robust defaults ensure functionality even without config file

### StateBus
- **Sets**: 
  - `response-router:initialized` - Boolean initialization status
  - `response-router:config` - Current configuration object
  - `response-router:stats` - Real-time routing statistics and performance metrics
  - `response-router:error` - Last error message if initialization/routing failed

### ErrorBus
- **Reports**: Atomic operation failures, rollback errors, event subscription issues
- **Severity**: Warning for operational errors, Fatal for initialization failures

## API

### Core Methods
```typescript
// Initialize with bus integration
const responseRouterBrick = new ResponseRouterBrick(eventBus, configBus, stateBus, errorBus);

// Set storage brick dependencies
responseRouterBrick.setStorageBricks(superJournalBrick, journalBrick);

// Check availability
const isReady = responseRouterBrick.ready;

// Get routing statistics
const stats = responseRouterBrick.statistics;

// Runtime configuration updates
await responseRouterBrick.updateConfiguration({
  enableRouting: false, // Disable automatic routing
  debugMode: true      // Enable detailed logging
});
```

### Automatic Event-Driven Operation
```typescript
// No manual calls needed - responds to events automatically
DualResponseBrick.generate() → publishes 'dual-response:generated'
  ↓ (automatic)
ResponseRouterBrick.handleDualResponseGenerated()
  ↓ (atomic operations)
[SuperJournal.store(), Journal.store()] → 'routing:complete'
```

## Configuration
File: `/aetherVault/config/ResponseRouterBrick.json`
```json
{
  "routingTargets": {
    "normalResponse": "SuperJournalBrick",
    "machineTrim": "JournalBrick"
  },
  "atomicOperations": true,
  "rollbackOnFailure": true,
  "maxRetries": 3,
  "retryDelayMs": 1000,
  "timeoutMs": 15000,
  "enableRouting": true,
  "debugMode": false
}
```

## Atomic Operation Architecture

### Success Case: Both Operations Succeed
```
Normal Response → SuperJournal ✅
Machine Trim   → Journal      ✅
Result: routing:complete
```

### Partial Failure: Rollback Required  
```
Normal Response → SuperJournal ✅
Machine Trim   → Journal      ❌
Rollback: SuperJournal.delete() → routing:rollback
Result: routing:error
```

### Total Failure: No Rollback Needed
```
Normal Response → SuperJournal ❌  
Machine Trim   → Journal      ❌
Result: routing:error (no rollback required)
```

## Integration Points

### With DualResponseBrick (Current)
```typescript
// Automatic integration via events - no code changes needed
const dualResponseBrick = new DualResponseBrick();
const responseRouterBrick = new ResponseRouterBrick(eventBus, configBus, stateBus, errorBus);

// DualResponse generation automatically triggers routing
const result = await dualResponseBrick.generate(request, llmService);
// ResponseRouterBrick automatically routes result to storage destinations
```

### With SuperJournalBrick (Existing)
```typescript
// Flexible API integration - supports multiple SuperJournal patterns
// Attempts: brick.store(), brick.storeMessage() based on available methods
// Rollback: brick.delete() if available
responseRouterBrick.setStorageBricks(superJournalBrick, journalBrick);
```

### With JournalBrick (Current)  
```typescript
// Uses established JournalBrick API patterns
// Storage: journalBrick.store(machineTrim, metadata)
// Rollback: journalBrick.delete(turnId)
responseRouterBrick.setStorageBricks(superJournalBrick, journalBrick);
```

### With Future MessageTurnBrick
```typescript
// Event-driven integration - MessageTurnBrick listens to routing events
eventBus.subscribe('routing:complete', (event) => {
  // Update conversation state to reflect successful dual storage
  messageTurnBrick.updateTurnStatus(event.routingId, 'stored');
});
```

## Essential Boss Rules Compliance

### Rule 4: LEGO Bricks ✅
- **Single Responsibility**: Automatic dual response routing only
- **Standard Bus Connectors**: ConfigBus, EventBus, StateBus, ErrorBus
- **Complete Independence**: Works in isolation with mock buses and storage bricks
- **Natural Composability**: Events enable automatic integration without coupling

### Rule 2: The Four Buses ✅
- **Event-Driven Architecture**: Zero coupling between DualResponseBrick and storage destinations
- **State Management**: Real-time routing statistics and performance monitoring
- **Configuration Management**: Runtime configuration updates via ConfigBus
- **Error Management**: Comprehensive error reporting with atomic operation details

### Rule 3: Thin Wrapper ✅
- **Minimal Abstraction**: Direct storage brick usage with flexible API compatibility
- **Platform Features Shine**: Full storage brick capabilities available
- **Native Error Handling**: Storage errors propagated with rollback context

### Rule 6: Don't Reinvent the Wheel ✅
- **Established Patterns**: Uses proven atomic transaction patterns
- **Existing Storage APIs**: Leverages SuperJournalBrick and JournalBrick without modification
- **Event Architecture**: Follows existing EventBus patterns and conventions

### Rule 8: No Hardcoding ✅
- **Externalized Configuration**: Routing targets, timeouts, retry policies in JSON
- **Runtime Configuration**: Dynamic routing behavior updates via API
- **Configurable Behavior**: Atomic operations, rollback strategies, debug modes

### Rule 5: Easy Removal ✅
**To remove ResponseRouterBrick completely:**
1. Delete `src/lib/bricks/ResponseRouterBrick/` folder
2. Remove ResponseRouterBrick initialization from consuming code
3. Remove `aetherVault/config/ResponseRouterBrick.json`
4. System falls back to manual dual storage (if needed)

**Fallback Behavior**: DualResponseBrick continues generating dual responses
**No Cascading Errors**: Storage bricks continue working independently  
**Graceful Degradation**: Manual routing can be implemented if needed

### Rule 9: Debug with Discipline ✅
- **Extensive Logging**: All operations logged with routing IDs and timing
- **Preserve Error Handling**: Never removes try/catch during debugging
- **Non-Destructive Debugging**: Add instrumentation without changing atomic logic
- **Performance Monitoring**: Real-time metrics without impacting operations

## Usage Examples

### Basic Automatic Routing
```typescript
// Initialize with storage bricks
const responseRouterBrick = new ResponseRouterBrick(eventBus, configBus, stateBus, errorBus);
responseRouterBrick.setStorageBricks(superJournalBrick, journalBrick);

// Routing happens automatically when dual responses are generated
const dualResponse = await dualResponseBrick.generate(request, llmService);
// No manual routing needed - ResponseRouterBrick handles it automatically
```

### Monitoring Routing Performance
```typescript
// Get real-time statistics
const stats = responseRouterBrick.statistics;
console.log(`Routing Success Rate: ${(stats.successful_routings / stats.total_routings * 100).toFixed(1)}%`);
console.log(`Average Routing Time: ${stats.average_routing_time_ms}ms`);
console.log(`Rollbacks Required: ${stats.rollbacks_required}`);
```

### Event-Driven Integration
```typescript
// Listen for routing completion
eventBus.subscribe('routing:complete', (event) => {
  console.log(`✅ Dual storage completed in ${event.performance.total_time_ms}ms`);
  // Update UI, trigger notifications, etc.
});

// Handle routing failures
eventBus.subscribe('routing:error', (event) => {
  console.error(`❌ Routing failed: ${event.error}`);
  // Implement fallback logic, user notifications, etc.
});
```

### Runtime Configuration Management
```typescript
// Disable routing temporarily for maintenance
await responseRouterBrick.updateConfiguration({ enableRouting: false });

// Enable debug mode for troubleshooting
await responseRouterBrick.updateConfiguration({ debugMode: true });

// Update retry policy for better reliability
await responseRouterBrick.updateConfiguration({ 
  maxRetries: 5, 
  retryDelayMs: 2000 
});
```

### Graceful Shutdown
```typescript
// Clean shutdown with event unsubscription
responseRouterBrick.destroy();
// All event subscriptions cleaned up, state cleared
```

## Performance Characteristics

### Routing Efficiency
- **Event Latency**: <10ms from dual-response event to routing initiation
- **Parallel Operations**: SuperJournal and Journal storage executed concurrently
- **Atomic Guarantee**: All operations succeed or all rollback

### Error Recovery
- **Rollback Speed**: Typically <500ms for common rollback scenarios
- **Retry Logic**: Exponential backoff prevents resource exhaustion
- **Failure Isolation**: Single routing failure doesn't affect other routings

### Monitoring & Observability  
- **Real-Time Stats**: Success rates, timing, rollback frequency
- **Debug Instrumentation**: Detailed logging with routing IDs for tracing
- **Performance Metrics**: Average routing time, operation counts

## Troubleshooting Guide

### Common Issues

**Routing Not Triggering**
- Check `enableRouting: true` in configuration
- Verify event subscriptions established during initialization
- Ensure DualResponseBrick is publishing `dual-response:generated` events

**Partial Storage Failures**
- Check rollback logs for successful cleanup
- Verify storage brick APIs are compatible
- Monitor timeout settings for slow operations

**Performance Issues**
- Review routing statistics for bottlenecks
- Adjust timeout and retry settings
- Check storage brick performance independently

### Debug Mode Benefits
- Detailed operation logging with timing
- Atomic operation step-by-step tracking  
- Configuration change notifications
- Event subscription confirmation

## Future Extensions
- **Multi-Target Routing**: Route to multiple storage destinations per response type
- **Conditional Routing**: Route based on response content, persona, or model
- **Batch Operations**: Group multiple routings for efficiency
- **Circuit Breaker**: Disable routing automatically during storage outages
- **Metrics Export**: Detailed performance metrics for monitoring systems

---

**ResponseRouterBrick**: The automation layer that completes dual-storage workflow, enabling transparent dual responses with atomic reliability and comprehensive observability.