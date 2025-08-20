# EventBus Wire Documentation

## Purpose
EventBus provides a typed, decoupled communication channel between bricks using the native browser EventTarget API.

## Integration Points
- **Location**: `apps/web/src/lib/buses/EventBus/`
- **Global Instance**: `apps/web/src/lib/buses/eventBus.svelte.ts`
- **Configuration**: `aetherVault/config/eventBus.json`

## Events Published
System events:
- `app:ready` - Fired when app initialization is complete
- `error` - Global error handling
- `debug:mode` - Debug mode toggled

## Events Subscribed
None - EventBus doesn't subscribe to events, it only facilitates communication.

## Removal Instructions
To remove EventBus completely:

1. **Delete the EventBus folder**
   ```bash
   rm -rf apps/web/src/lib/buses/EventBus/
   ```

2. **Remove global instance**
   ```bash
   rm apps/web/src/lib/buses/eventBus.svelte.ts
   ```

3. **Remove exports from buses index**
   - Edit `apps/web/src/lib/buses/index.ts`
   - Remove all EventBus-related exports

4. **Delete configuration**
   ```bash
   rm aetherVault/config/eventBus.json
   ```

**Result**: App continues to work. Bricks that communicated via events will no longer receive updates from each other, but each brick continues to function independently. No compilation errors, no runtime crashes.

## How Other Bricks Use EventBus

### Publishing Events
```typescript
import { eventBus } from '$lib/buses';

// In your brick
eventBus.publish('persona:changed', { 
    persona: 'Professor',
    previousPersona: 'Student' 
});
```

### Subscribing to Events
```typescript
import { eventBus } from '$lib/buses';
import { onMount, onDestroy } from 'svelte';

let unsubscribe: () => void;

onMount(() => {
    unsubscribe = eventBus.subscribe('persona:changed', (detail) => {
        console.log(`Persona changed to ${detail.persona}`);
    });
});

onDestroy(() => {
    unsubscribe?.();
});
```

### Adding New Event Types
Extend the AppEventMap interface:
```typescript
// In your brick's types file
declare module '$lib/buses/EventBus/types/EventMap' {
    interface AppEventMap {
        'yourBrick:eventName': {
            // Your event payload type
            data: string;
        };
    }
}
```

## Testing
- Unit tests: `npm test -- EventBus`
- Browser DevTools: `window.__eventBus` (DEV mode only)
- Check event flow: Chrome DevTools > Console > `getEventListeners(window.__eventBus.getTarget())`

## Dependencies
- None (uses native browser EventTarget)

## Notes
- EventBus is frontend-only by design
- Backend uses Hono's middleware composition pattern
- Thin wrapper following Rule 3 - platform behavior shines through
- Easy removal following Rule 5 - delete in 4 steps with zero breaking changes