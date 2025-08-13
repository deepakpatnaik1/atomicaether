# StateBus Wire Documentation

## Purpose
StateBus is the shared reactive state coordinator for the atomicaether system. It provides a thin coordination layer for state that multiple bricks need to access, while each brick maintains its own internal state.

## Core Philosophy
**StateBus is NOT a global state manager.** It's specifically for state that needs to be shared between bricks. Each brick should use Svelte's `$state` for its own internal state.

## Architecture

### Reactive Storage Only
StateBus provides reactive storage without event broadcasting. Reactivity is handled entirely by Svelte 5's `$state` rune. Components that need to react to state changes use Svelte's `$effect`.

```typescript
// Get reactive state
const theme = stateBus.get('app:theme');

// React to changes
$effect(() => {
    console.log('Theme changed:', theme);
});
```

### Type-Safe State Keys
All state keys must be declared in the StateMap interface. This provides:
- Autocomplete in IDEs
- Compile-time type checking
- Prevents random state keys floating around

### Lazy Initialization
States are created on first access, not pre-registered. This keeps memory usage minimal and allows bricks to be truly independent.

### No Persistence
StateBus only handles in-memory reactive state. Persistence to localStorage/sessionStorage is a separate concern (future PersistenceBrick).

### No Computed States
Use Svelte's `$derived` rune for computed values. StateBus focuses solely on state coordination.

## Integration Pattern

### Extending StateMap
Each brick extends the StateMap interface via module augmentation:

```typescript
// In your brick's state definition file
declare module '$lib/buses/StateBus/models/StateMap' {
    interface StateMap {
        'personaSelector:current': string;
        'personaSelector:available': string[];
        'personaSelector:loading': boolean;
    }
}
```

### Using State in Components
```svelte
<script lang="ts">
import { stateBus } from '$lib/buses';

// Get reactive state
const currentPersona = stateBus.get('personaSelector:current');
const isLoading = stateBus.get('personaSelector:loading');

// Update state
function selectPersona(persona: string) {
    stateBus.set('personaSelector:current', persona);
}

// React to changes
$effect(() => {
    if (currentPersona) {
        console.log('Persona selected:', currentPersona);
    }
});
</script>
```

## State Naming Convention
Use namespaced keys to prevent collisions:
- `app:*` - Core application states
- `brickName:*` - Brick-specific shared states
- Use descriptive names: `personaSelector:current` not `ps:c`

## When to Use StateBus vs Internal State

### Use StateBus When:
- Multiple bricks need to read/write the same value
- State needs to survive component unmount/remount
- Cross-component coordination is required
- Building a "shared whiteboard" pattern

### Use Internal $state When:
- State is only used within one component
- State is temporary UI state (hover, focus, etc.)
- State is derived from props
- Performance is critical (direct $state is faster)

## Performance Considerations
- StateBus adds a thin layer over $state
- Each state access has Map lookup overhead
- Still faster than event-based state systems
- Reactivity is handled by Svelte's optimized runtime

## Testing Strategy
- Test reactive updates propagate correctly
- Test type safety at compile time
- Test lazy initialization behavior
- Test multiple subscribers to same state
- Test state isolation between keys

## Debug Tools
In development, StateBus is exposed on window:
```javascript
window.__stateBus.keys()  // See all initialized states
window.__stateBus.get('app:theme')  // Inspect state values
window.__stateBus.set('debug:enabled', true)  // Modify states
```

## Removal Impact
If StateBus is removed:
1. Bricks can no longer share state easily
2. Each brick would need its own state management
3. Cross-brick coordination becomes difficult
4. No central place to inspect shared state

The app continues to function, but bricks become isolated islands.

## Future Considerations
- PersistenceBrick could subscribe to StateBus changes
- ConfigBus could populate initial StateBus values
- DevTools extension could visualize state flow
- Time-travel debugging could be added as a separate brick