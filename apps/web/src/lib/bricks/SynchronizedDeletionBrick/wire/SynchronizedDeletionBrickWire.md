# SynchronizedDeletionBrick - Wire Documentation

## Easy Removal Process (Rule 5 Compliance)

**Removal Time:** Under 5 steps
**Cascading Failures:** None
**Degradation:** Graceful fallback to individual storage deletion

### Step 1: Stop Event Subscriptions
```typescript
// The brick automatically unsubscribes on destroy()
synchronizedDeletionBrick.destroy();
```

### Step 2: Remove from Application
```typescript
// Remove from component/service that instantiated it
// Example: In main app initialization
// delete synchronizedDeletionBrick;
// synchronizedDeletionBrick = null;
```

### Step 3: Remove Configuration (Optional)
```bash
# Remove external configuration file
rm aetherVault/config/SynchronizedDeletionBrick.json
```

## What Functionality Is Lost

When SynchronizedDeletionBrick is removed:

- ❌ **Atomic Deletion Operations**: No coordinated deletion across SuperJournal + Journal
- ❌ **Rollback Capability**: No automatic rollback on partial deletion failures  
- ❌ **Deletion Statistics**: No metrics tracking for deletion operations
- ❌ **Deletion Events**: No `deletion:started`, `deletion:complete`, `deletion:error` events

## How The App Degrades Gracefully

### Fallback Behavior
Without SynchronizedDeletionBrick, deletion requests fall back to:

1. **Individual Storage Deletion**: Each storage system handles deletions independently
2. **No Atomic Guarantees**: Partial deletions possible without rollback
3. **Manual Coordination**: Developers must manually coordinate cross-storage deletions
4. **Event Loss**: Components listening for deletion events receive no notifications

### System Integrity
- ✅ **No Crashes**: Application continues to function normally
- ✅ **No TypeScript Errors**: All imports are optional or have fallback handling  
- ✅ **Storage Systems Intact**: SuperJournalBrick and JournalBrick work independently
- ✅ **Turn Management**: MessageTurnBrick continues normal operation

## Dependencies and Integrations

### What This Brick Depends On
- **EventBus**: For `turn:delete:request` events and publishing deletion events
- **ConfigBus**: For loading `SynchronizedDeletionBrick.json` configuration
- **StateBus**: For deletion statistics and operational state
- **ErrorBus**: For error reporting and logging
- **Storage Bricks**: SuperJournalBrick and JournalBrick via dependency injection

### What Depends On This Brick
- **Turn Management UI**: Components that trigger deletion operations
- **Deletion Monitoring**: Dashboards that track deletion statistics
- **Audit Systems**: Services that monitor deletion events
- **Storage Consistency**: Systems that require atomic dual-storage operations

## Testing Removal

### Validation Checklist
- [ ] Application starts without errors
- [ ] Turn deletion requests still function (individual storage)
- [ ] No console errors related to missing deletion events
- [ ] Storage systems continue independent operation
- [ ] Performance monitoring shows no impact on core functionality

### Re-enabling
To re-enable synchronized deletion:
1. Restore the configuration file
2. Re-instantiate SynchronizedDeletionBrick 
3. Call `setStorageBricks()` to configure storage integration
4. Verify deletion events are publishing correctly

## Architecture Impact

### Before Removal
```
Turn Delete Request
       ↓
SynchronizedDeletionBrick
       ↓
DeletionOrchestrator
    ↙        ↘
SuperJournal  Journal
   (atomic transaction)
```

### After Removal  
```
Turn Delete Request
       ↓
Manual coordination required
    ↙        ↘
SuperJournal  Journal
(independent operations)
```

This wire documentation ensures SynchronizedDeletionBrick can be safely removed while maintaining system integrity and providing clear understanding of degradation impacts.