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

---

# BRICK-103-StateBus Documentation

## One Line
Thin coordination layer for shared reactive state between bricks using Svelte 5's $state rune.

## Integration
```typescript
import { stateBus } from '$lib/buses';
const counterState = stateBus.getState('app:counter');
counterState.value = 42;
$effect(() => console.log(counterState.value));
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/buses/StateBus/ folder
2. Remove stateBus.svelte.ts and exports from apps/web/src/lib/buses/index.ts

Result: Bricks can no longer share state easily. Each brick must manage its own state. Cross-brick coordination becomes difficult.

## Events

Publishes:
- None - StateBus is reactive storage only, not an event system

Subscribes to:
- None - Uses Svelte's reactivity, not events

## Config

None - StateBus has no configuration file. All behavior is code-driven.

## Dependencies

- None

## API

```typescript
stateBus.get(key): T | undefined           // Get current value
stateBus.set(key, value): void            // Set value
stateBus.getState(key): StateAccessor<T>  // Get reactive accessor
stateBus.update(key, fn): void            // Update with function
stateBus.getOrCreate(key, default): T     // Get or init with default
stateBus.has(key): boolean                 // Check if exists
stateBus.delete(key): void                 // Delete state
stateBus.keys(): string[]                  // List all keys
```

## Testing

npm test -- StateBus
Browser DevTools: window.__stateBus (DEV mode only)

## Notes

- NOT a global state manager - only for shared state between bricks
- Each brick should use $state for internal state
- Lazy initialization - states created on first access
- Type-safe via TypeScript module augmentation
- No persistence - that's a separate brick's responsibility
- No computed states - use Svelte's $derived

---

# BRICK-104-ConfigBus Documentation

## One Line
Type-safe JSON configuration loader with environment variable substitution and hot reload in development.

## Integration
```typescript
import { configBus } from '$lib/buses';
const config = await configBus.load('app');
// config is fully typed!
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/buses/ConfigBus/ folder
2. Remove configBus.svelte.ts and exports from apps/web/src/lib/buses/index.ts
3. Remove symlink/static config directory

Result: All configuration becomes hardcoded. No runtime config changes. Loss of hot reload and environment flexibility.

## Events

Publishes:
- config:loaded - Config successfully loaded
- config:error - Config load failed
- config:reloaded - Config hot reloaded (dev only)
- config:cleared - Cache cleared

Subscribes to:
- None - ConfigBus only publishes

## Config

None - ConfigBus itself has no config file (it loads them!)

## Dependencies

- EventBus (optional, for notifications)

## API

```typescript
configBus.load(key, options?): Promise<T>      // Load config
configBus.get(key): T | undefined              // Get cached
configBus.has(key): boolean                    // Check if cached
configBus.reload(key): Promise<T>              // Force reload
configBus.clear(key): void                     // Clear specific
configBus.clearAll(): void                     // Clear all
configBus.keys(): string[]                     // List cached
configBus.loadMany(keys): Promise<{...}>       // Load multiple
```

## Testing

npm test -- ConfigBus
Browser DevTools: window.__configBus (DEV mode only)

## Notes

- Runtime fetch in dev (hot reload) / Build-time bundling in prod
- Environment variable substitution: ${VAR:-default}
- All configs in aetherVault/config/*.json
- Type safety via module augmentation
- Caching for performance
- Never put secrets in client configs!