# Rule 3: Thin Wrappers - The Bridge Between Platform and Architecture

**The Principle**: Buses are the thinnest possible layer over native APIs. Just enough abstraction to enable decoupling, never enough to hide the platform.

### The Balance

```typescript
// ❌ TOO THIN: No abstraction, tight coupling
class MessageStore {
    constructor() {
        window.addEventListener('persona-changed', (e) => {
            // Now MessageStore is coupled to DOM events
        });
    }
}

// ❌ TOO THICK: Hiding the platform
class EventBus {
    private queue: Event[] = [];
    private subscribers: Map<string, Function[]> = new Map();
    
    publish(event: string, data: any) {
        // Building our own event system, ignoring EventTarget!
        this.queue.push({ event, data });
        this.processQueue();
    }
}

// ✅ JUST RIGHT: Thin wrapper over EventTarget
class EventBus {
    private target = new EventTarget();
    
    publish<T>(type: string, detail: T) {
        // Direct pass-through to native API
        this.target.dispatchEvent(new CustomEvent(type, { detail }));
    }
}
```

### What Makes a Wrapper "Thin"

1. **One native API per bus**
   - EventBus wraps EventTarget
   - ConfigBus wraps fetch/dynamic import
   - StateBus wraps Svelte stores
   - ErrorBus wraps Error + CustomEvent

2. **Minimal transformation**
   ```typescript
   // Just adding type safety, not changing behavior
   publish<T extends BusEvent>(event: T) {
       this.target.dispatchEvent(new CustomEvent(event.type, { detail: event }));
   }
   ```

3. **Platform behavior shines through**
   ```typescript
   // Event bubbling still works
   // Event.preventDefault() still works
   // All EventTarget features available
   ```

### Why This Matters

**For Web Platform Alignment (Rule 1)**:
- Developers can reason about buses using web knowledge
- Browser DevTools work naturally
- Platform optimizations apply

**For Decoupling (Rule 2)**:
- Consistent interface across all bricks
- Type safety prevents coupling mistakes
- Clear contract between components

### Implementation Guidelines

```typescript
// ConfigBus: Thin wrapper over fetch
class ConfigBus {
    async load<T>(name: string): Promise<T> {
        // Not caching, not transforming, just typed fetch
        const response = await fetch(`/config/${name}.json`);
        if (!response.ok) throw new Error(`Config ${name} not found`);
        return response.json();
    }
}

// StateBus: Thin wrapper over Svelte stores
class StateBus {
    private stores = new Map<string, Writable<any>>();
    
    set<T>(key: string, value: T) {
        if (!this.stores.has(key)) {
            this.stores.set(key, writable(value));
        } else {
            this.stores.get(key)!.set(value);
        }
        // That's it - Svelte handles reactivity
    }
}
```

### The Litmus Test

Ask yourself:
1. Could a web developer understand this bus by reading MDN?
2. Does the bus method map 1:1 to a native API method?
3. Am I adding features or just type safety?

If you're adding features beyond type safety, you've gone too thick.

### Benefits of Thin Wrappers

- **Learning curve**: Know the web? You know our buses
- **Debugging**: Browser DevTools just work
- **Performance**: No overhead beyond native APIs
- **Future-proof**: Web improvements automatically benefit us
- **Testability**: Can test with standard web testing tools

The magic: Maximum architectural benefits with minimum abstraction cost.