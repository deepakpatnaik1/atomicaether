<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { eventBus } from '$lib/buses';
    
    // Example: Simple counter that broadcasts its changes
    let count = $state(0);
    let messages = $state<string[]>([]);
    let unsubscribe: (() => void) | undefined;
    
    // Extend the event map for this example
    declare module '$lib/buses/EventBus/types/EventMap' {
        interface AppEventMap {
            'counter:changed': {
                value: number;
                timestamp: number;
            };
        }
    }
    
    onMount(() => {
        // Subscribe to counter changes (could be from another component)
        const unsubCounter = eventBus.subscribe('counter:changed', (detail) => {
            messages = [...messages, `Counter changed to ${detail.value} at ${new Date(detail.timestamp).toLocaleTimeString()}`];
        });
        
        // Subscribe to error events (normally an ErrorToast brick would do this)
        const unsubError = eventBus.subscribe('error', (detail) => {
            messages = [...messages, `❌ Error: ${detail.error.message} (from ${detail.source}, recoverable: ${detail.recoverable})`];
            console.error('Error event received:', detail);
        });
        
        // Combine unsubscribe functions
        unsubscribe = () => {
            unsubCounter();
            unsubError();
        };
        
        // Announce app is ready
        eventBus.publish('app:ready', { timestamp: Date.now() });
    });
    
    onDestroy(() => {
        unsubscribe?.();
    });
    
    function increment() {
        count++;
        // Publish the change - any brick can listen to this
        eventBus.publish('counter:changed', {
            value: count,
            timestamp: Date.now()
        });
    }
    
    function triggerError() {
        // Example of error handling via EventBus
        eventBus.publish('error', {
            error: new Error('Example error'),
            source: 'HomePage',
            recoverable: true
        });
    }
</script>

<main>
    <h1>EventBus Demo</h1>
    
    <section>
        <h2>Counter Example</h2>
        <p>Count: {count}</p>
        <button onclick={increment}>
            Increment & Broadcast
        </button>
        <button onclick={triggerError}>
            Trigger Error Event
        </button>
    </section>
    
    <section>
        <h2>Event Log</h2>
        {#if messages.length > 0}
            <ul>
                {#each messages as message}
                    <li>{message}</li>
                {/each}
            </ul>
        {:else}
            <p>No events yet. Click the button to generate events.</p>
        {/if}
    </section>
    
    <section>
        <h2>Debug Info</h2>
        <p>Open browser console and type: <code>window.__eventBus</code> (DEV only)</p>
        <p>Try: <code>window.__eventBus.publish('counter:changed', {'{'} value: 99, timestamp: Date.now() {'}'})</code></p>
    </section>
</main>

<style>
    main {
        max-width: 800px;
        margin: 2rem auto;
        padding: 1rem;
        font-family: system-ui, -apple-system, sans-serif;
    }
    
    section {
        margin: 2rem 0;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 8px;
    }
    
    h1 {
        color: #333;
    }
    
    h2 {
        color: #666;
        font-size: 1.2rem;
    }
    
    button {
        margin: 0.5rem;
        padding: 0.5rem 1rem;
        border: 1px solid #007AFF;
        background: #007AFF;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
    }
    
    button:hover {
        background: #0051D5;
    }
    
    ul {
        list-style: none;
        padding: 0;
    }
    
    li {
        padding: 0.5rem;
        margin: 0.25rem 0;
        background: #f5f5f5;
        border-radius: 4px;
    }
    
    code {
        background: #f0f0f0;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
    }
</style>