# Rule 1: Webby - Write Code the Way the Modern Web Wants

**The Principle**: Embrace web platform standards, TypeScript's type system, and framework idioms. The web has its own patterns - respect them.

### What This Means in Practice

```typescript
// ✅ WEBBY: Modern web patterns with TypeScript
// EventBus using native EventTarget + TypeScript generics
export class EventBus<T extends Record<string, any>> {
    private target = new EventTarget();
    
    subscribe<K extends keyof T>(
        event: K, 
        handler: (detail: T[K]) => void
    ): () => void {
        const listener = (e: Event) => {
            handler((e as CustomEvent<T[K]>).detail);
        };
        this.target.addEventListener(event as string, listener);
        return () => this.target.removeEventListener(event as string, listener);
    }
    
    publish<K extends keyof T>(event: K, detail: T[K]) {
        this.target.dispatchEvent(
            new CustomEvent(event as string, { detail })
        );
    }
}

// Svelte 5 with runes for reactive state
export function createMessageStore() {
    let messages = $state<Message[]>([]);
    
    return {
        get messages() { return messages; },
        add: (message: Message) => { messages = [...messages, message]; },
        subscribe: (fn: (msgs: Message[]) => void) => {
            $effect(() => fn(messages));
        }
    };
}

// ❌ NOT WEBBY: Fighting the platform
class BadEventBus {
    private handlers: any = {};  // Reimplementing EventTarget
    on(event: string, handler: Function) {  // No type safety
        // Building our own event system
    }
}
```

### The Webby Checklist

**Frontend (SvelteKit)**
- **Svelte 5 runes** (`$state`, `$effect`) for reactivity
- **TypeScript strict mode** with proper generics
- **Native Web APIs** first (EventTarget, CustomEvent, fetch)
- **CSS custom properties** for theming
- **Form actions** for progressive enhancement
- **Load functions** for data fetching

**Backend (Hono)**
- **Type-safe routing** with Hono's inference
- **Zod schemas** for validation
- **Edge-ready** patterns (no Node-specific APIs)
- **Middleware composition** for concerns
- **OpenAPI generation** from types

**Shared Patterns**
- **ESM modules** everywhere
- **Type inference** over explicit types
- **Async iterators** for streaming
- **Web Streams API** for data flow
- **JSON schemas** as source of truth

### Real Implementation
- EventBus leverages `EventTarget` not custom pub/sub
- ConfigBus uses dynamic imports and fetch
- StateBus built on Svelte's fine-grained reactivity
- Streaming via `ReadableStream` and `TextDecoderStream`
- Validation at runtime boundaries with Zod
- Type safety through inference, not manual typing

The key: Modern web development has evolved. Use the platform's built-in capabilities rather than rebuilding them. TypeScript for safety, but lean on inference. Svelte for reactivity, but use the new runes. Standards over libraries.