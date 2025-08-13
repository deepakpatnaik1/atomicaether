# ErrorBus Wire Documentation

## Purpose
ErrorBus is a facade over EventBus that provides error-specific convenience methods, automatic deduplication, and global error capture.

## Integration Points
- **Location**: `apps/web/src/lib/buses/ErrorBus/`
- **Global Instance**: `apps/web/src/lib/buses/errorBus.svelte.ts`
- **Configuration**: `aetherVault/config/errorBus.json`
- **Dependency**: Uses EventBus for actual event transport

## Events Published
- `error` - All errors flow through this single event type
  - Payload: `ErrorContext` with error, source, recoverable flag, timestamp

## Events Subscribed
None - ErrorBus only publishes errors.

## Removal Instructions
To remove ErrorBus completely:

1. **Delete the ErrorBus folder**
   ```bash
   rm -rf apps/web/src/lib/buses/ErrorBus/
   ```

2. **Remove global instance**
   ```bash
   rm apps/web/src/lib/buses/errorBus.svelte.ts
   ```

3. **Remove exports from buses index**
   - Edit `apps/web/src/lib/buses/index.ts`
   - Remove ErrorBus-related exports

4. **Delete configuration**
   ```bash
   rm aetherVault/config/errorBus.json
   ```

**Result**: App continues to work. Bricks can still publish error events directly to EventBus using `eventBus.publish('error', context)`. Global error capture (window.onerror, unhandledrejection) will be lost. Error deduplication will be lost.

## How Other Bricks Use ErrorBus

### Reporting Errors
```typescript
import { errorBus } from '$lib/buses';

// Recoverable error (user can retry)
try {
    await riskyOperation();
} catch (error) {
    errorBus.reportRecoverable(error as Error, 'MyBrick');
}

// Fatal error (requires refresh)
errorBus.reportFatal(new Error('Critical failure'), 'MyBrick');

// With metadata
errorBus.report(error, 'MyBrick', true, {
    userId: currentUser.id,
    action: 'save_draft'
});
```

### Subscribing to Errors
```typescript
import { errorBus } from '$lib/buses';
import { onMount, onDestroy } from 'svelte';

let unsubscribe: () => void;

onMount(() => {
    unsubscribe = errorBus.subscribe((context) => {
        if (context.recoverable) {
            showToast(`Error: ${context.error.message}`);
        } else {
            showModal('Fatal error occurred. Please refresh.');
        }
        
        // Stack trace preserved for debugging
        console.error('Full error:', context.error);
    });
});

onDestroy(() => {
    unsubscribe?.();
});
```

## Configuration Options
```json
{
    "captureGlobalErrors": true,        // Capture window.onerror
    "captureUnhandledRejections": true, // Capture promise rejections
    "logToConsole": true,               // Log errors to console
    "deduplication": {
        "enabled": true,                // Skip duplicate errors
        "windowMs": 100                 // Within this time window
    }
}
```

## Testing
- Unit tests: `npm test -- ErrorBus`
- Browser DevTools: `window.__errorBus` (DEV mode only)
- Test global capture: Throw error in console, see it reported
- Test deduplication: Rapid errors should only report once

## Dependencies
- EventBus (for event transport)

## Notes
- ErrorBus is a facade, not a separate event system
- Original Error objects are never modified (stack traces preserved)
- Global handlers don't preventDefault (errors still reach DevTools)
- Deduplication prevents error spam from loops
- Test environment automatically disables global handlers