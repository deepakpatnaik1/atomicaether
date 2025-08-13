# BRICK-101-EventBus Documentation

## One Line
Thin wrapper around native EventTarget providing type-safe, decoupled communication between bricks.

## Integration
```typescript
import { eventBus } from '$lib/buses';
eventBus.subscribe('event:name', handler);
eventBus.publish('event:name', payload);
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/buses/EventBus/ folder
2. Remove eventBus.svelte.ts and exports from apps/web/src/lib/buses/index.ts
3. Delete aetherVault/config/eventBus.json

Result: App continues working, bricks can't communicate via events but function independently.

## Events

Publishes:
- app:ready - When app initialization is complete, payload: { timestamp: number }
- error - Global error reporting, payload: { error: Error, source?: string, recoverable?: boolean }
- debug:mode - Debug mode toggled, payload: { enabled: boolean }

Subscribes to:
- None - EventBus only facilitates communication

## Config

aetherVault/config/eventBus.json
```json
{
    "debug": {
        "enabled": false,        // Master debug switch
        "logEvents": false,      // Log all events to console
        "logSubscriptions": false // Log subscribe/unsubscribe
    },
    "performance": {
        "maxListenersWarning": 10  // Warn if too many listeners
    }
}
```

## Dependencies

- None

## API

```typescript
eventBus.subscribe(event, handler): () => void  // Returns unsubscribe function
eventBus.publish(event, detail): void
eventBus.once(event, handler): () => void       // Auto-unsubscribe after first event
eventBus.getTarget(): EventTarget               // Access native EventTarget
```

## Testing

npm test -- EventBus
Browser DevTools: window.__eventBus (DEV mode only)

## Notes

- Frontend-only by design (backend uses Hono middleware)
- Uses native EventTarget - DevTools compatible
- Type-safe via TypeScript generics and module augmentation

---

# BRICK-102-ErrorBus Documentation

## One Line
Facade over EventBus providing error-specific convenience methods, deduplication, and global error capture.

## Integration
```typescript
import { errorBus } from '$lib/buses';
errorBus.reportRecoverable(error, 'BrickName');
errorBus.reportFatal(error, 'BrickName');
errorBus.subscribe(handler);
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/buses/ErrorBus/ folder
2. Remove errorBus.svelte.ts and exports from apps/web/src/lib/buses/index.ts
3. Delete aetherVault/config/errorBus.json

Result: App continues working, errors can still be published via eventBus.publish('error', context). Lose deduplication and global capture.

## Events

Publishes:
- error - All errors flow through this event, payload: ErrorContext

Subscribes to:
- None - ErrorBus only publishes

## Config

aetherVault/config/errorBus.json
```json
{
    "captureGlobalErrors": true,        // Catch window.onerror
    "captureUnhandledRejections": true, // Catch promise rejections  
    "logToConsole": true,               // Log to console
    "deduplication": {
        "enabled": true,                // Prevent error spam
        "windowMs": 100                 // Time window
    }
}
```

## Dependencies

- EventBus (uses it for transport)

## API

```typescript
errorBus.report(error, source, recoverable?, metadata?): void
errorBus.reportRecoverable(error, source, metadata?): void
errorBus.reportFatal(error, source, metadata?): void
errorBus.subscribe(handler): () => void  // Returns unsubscribe
```

## Testing

npm test -- ErrorBus
Browser DevTools: window.__errorBus (DEV mode only)

## Notes

- Facade pattern - uses EventBus underneath
- Preserves original Error objects and stack traces
- Automatic deduplication prevents error spam
- Global handlers don't preventDefault (errors reach DevTools)