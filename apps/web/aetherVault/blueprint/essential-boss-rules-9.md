# Rule 9: Debug with Discipline - Don't Destroy to Fix

**The Principle**: When debugging, maintain awareness of the entire system. The bug you're fixing is not more important than the features that already work.

### The Debugging Trap

```typescript
// ❌ RECKLESS: Tunnel vision debugging
class MessageBrick {
    async sendMessage(text: string) {
        // Bug: Messages sometimes fail to send
        // "Fix": Let me bypass all validation!
        
        // Commented out "to debug"
        // if (!this.validateMessage(text)) return;
        
        // Disabled "temporarily"
        // await this.rateLimiter.check();
        
        // Removed "for testing"
        // this.eventBus.publish(new MessageSendingEvent());
        
        // Hardcoded "just to see"
        const response = await fetch('http://localhost:3000/test', {
            // Skipped auth "to isolate the issue"
            // headers: { Authorization: this.auth.token }
        });
    }
}

// ✅ DISCIPLINED: Fix without breaking
class MessageBrick {
    async sendMessage(text: string) {
        // Add debugging without removing safeguards
        console.log('[DEBUG] Sending message:', text.substring(0, 50));
        
        if (!this.validateMessage(text)) {
            console.log('[DEBUG] Validation failed');
            return;
        }
        
        try {
            await this.rateLimiter.check();
        } catch (e) {
            console.log('[DEBUG] Rate limiter error:', e);
            throw e; // Still throw - don't hide problems
        }
        
        // Keep all events - they might be important
        this.eventBus.publish(new MessageSendingEvent());
        
        const response = await fetch(this.config.apiUrl, {
            headers: { 
                Authorization: this.auth.token,
                'X-Debug': 'true' // Add debug flag instead
            }
        });
    }
}
```

### The Big Picture Checklist

Before making ANY debugging change, ask:

1. **What else depends on this?**
   ```typescript
   // Before removing this event
   this.eventBus.publish(new PersonaChangedEvent());
   // Ask: Who subscribes to PersonaChangedEvent?
   // MessageBrick? ThemeBrick? AnalyticsBrick?
   ```

2. **What protection am I removing?**
   ```typescript
   // Before commenting out validation
   if (!this.isValidInput(data)) return;
   // Ask: What bad data will now flow through?
   // Will it corrupt the database? Crash the UI?
   ```

3. **What assumptions am I breaking?**
   ```typescript
   // Before hardcoding a value
   const timeout = 5000; // was: this.config.timeout
   // Ask: What if config.timeout is coordinated with other timeouts?
   // What if it's different in production?
   ```

### Debugging Patterns That Preserve

**Pattern 1: Add, Don't Remove**
```typescript
// ❌ RECKLESS: Remove to debug
// await this.validatePermissions();  // Commented out

// ✅ DISCIPLINED: Add debugging
console.log('[DEBUG] Checking permissions...');
const hasPermission = await this.validatePermissions();
console.log('[DEBUG] Permission result:', hasPermission);
if (!hasPermission && DEBUG_BYPASS_PERMISSIONS) {
    console.warn('[DEBUG] Bypassing permissions - DEV ONLY');
    return true;
}
```

**Pattern 2: Fork, Don't Modify**
```typescript
// ❌ RECKLESS: Modify existing logic
async processMessage(msg: Message) {
    // Completely rewrote this method to debug
    return { debug: true, processed: false };
}

// ✅ DISCIPLINED: Fork the flow
async processMessage(msg: Message) {
    if (this.config.debugMode) {
        return this.processMessageDebug(msg);
    }
    // Original logic untouched
    return this.processMessageNormal(msg);
}
```

**Pattern 3: Wrap, Don't Replace**
```typescript
// ❌ RECKLESS: Replace the service
this.apiService = new MockApiService();  // Lost real behavior

// ✅ DISCIPLINED: Wrap with logging
this.apiService = new LoggingWrapper(this.apiService, {
    logRequests: true,
    logResponses: true,
    logTiming: true
});
```

### The Debug-Safe Strategies

**1. Feature Flags for Debug Code**
```typescript
// config/debug.json
{
    "enableVerboseLogging": true,
    "bypassRateLimits": false,
    "mockExternalAPIs": false,
    "showDebugPanel": true
}

// In code
if (this.config.debug.enableVerboseLogging) {
    console.log('[DEBUG]', ...args);
}
```

**2. Debug-Only Event Subscribers**
```typescript
// Don't modify existing events, add debug listeners
if (import.meta.env.DEV) {
    this.eventBus.subscribe('*', (event) => {
        console.log('[EVENT]', event.type, event.detail);
    });
}
```

**3. Parallel Debug Systems**
```typescript
// Don't modify MessageStore, create DebugMessageStore
class DebugMessageStore extends MessageStore {
    async add(message: Message) {
        console.log('[DEBUG] Adding message:', message);
        const result = await super.add(message);
        console.log('[DEBUG] Message added, new count:', this.count);
        return result;
    }
}
```

### The Danger Zones

**🚨 Never "Temporarily" Remove:**
- Authentication checks
- Permission validations  
- Rate limiting
- Input sanitization
- Error boundaries
- Event publishing
- State updates

**🚨 Never "Just Quickly" Hardcode:**
- API endpoints
- User IDs
- Access tokens  
- Feature flags
- Timeouts
- Limits

**🚨 Never "For Debugging" Modify:**
- Database schemas
- API contracts
- Event payloads
- Configuration structures
- Business logic flows

### The Recovery Protocol

When you realize you've broken things while debugging:

1. **Stop immediately** - Don't dig deeper
2. **Git status** - See what you've changed
3. **Identify critical changes** - What safeguards did you remove?
4. **Restore safeguards first** - Before continuing to debug
5. **Add proper debugging** - Using safe patterns
6. **Document the issue** - For future debugging

### The Debug Workflow

```typescript
// 1. Reproduce with logging
logger.setLevel('debug');
// Try to reproduce issue

// 2. Add temporary instrumentation  
const debugWrapper = new DebugWrapper(problematicService);
// Gather data

// 3. Form hypothesis
// "Seems like race condition in event ordering"

// 4. Test hypothesis safely
if (DEBUG_DELAY_EVENTS) {
    await delay(100); // Test race condition theory
}

// 5. Fix with minimal change
// Only modify what's actually broken

// 6. Remove debug code
// Clean up instrumentation
```

### The Testing Safety Net

Before committing ANY debug-motivated change:

```bash
# Run the full test suite
npm test

# Run integration tests
npm run test:integration  

# Check for broken features
npm run test:e2e

# Verify no regressions
npm run test:regression
```

### Remember

Debugging is like surgery - precision matters more than speed. Every "quick fix" that breaks two other things creates three new bugs. The feature that's been working for months is more important than the bug you found today.

Your job is to fix bugs without creating new ones. If your debugging breaks existing features, you're not debugging - you're destroying.