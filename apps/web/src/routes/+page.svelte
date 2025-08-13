<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { eventBus, errorBus } from '$lib/buses';
    
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
    
    function triggerRecoverableError() {
        // Example of recoverable error via ErrorBus
        errorBus.reportRecoverable(
            new Error('Network timeout - please try again'),
            'HomePage',
            { action: 'fetch_data', attempt: 1 }
        );
    }
    
    function triggerFatalError() {
        // Example of fatal error via ErrorBus
        errorBus.reportFatal(
            new Error('Database connection lost'),
            'HomePage',
            { component: 'demo' }
        );
    }
    
    function triggerDuplicateErrors() {
        // Test deduplication - only first should go through
        const error = new Error('Duplicate error test');
        for (let i = 0; i < 5; i++) {
            errorBus.report(error, 'HomePage', true);
        }
    }
    
    function triggerUncaughtError() {
        // This will be caught by window.onerror
        setTimeout(() => {
            throw new Error('Uncaught error from setTimeout');
        }, 0);
    }
    
    function triggerUnhandledRejection() {
        // This will be caught by unhandledrejection handler
        Promise.reject(new Error('Unhandled promise rejection'));
    }
</script>

<main>
    <h1>EventBus & ErrorBus Demo</h1>
    
    <section>
        <h2>Counter Example (EventBus)</h2>
        <p>Count: {count}</p>
        <button onclick={increment}>
            Increment & Broadcast
        </button>
    </section>
    
    <section>
        <h2>Error Examples (ErrorBus)</h2>
        <div class="button-grid">
            <button onclick={triggerRecoverableError} class="recoverable">
                Recoverable Error
            </button>
            <button onclick={triggerFatalError} class="fatal">
                Fatal Error
            </button>
            <button onclick={triggerDuplicateErrors}>
                Duplicate Errors (×5)
            </button>
            <button onclick={triggerUncaughtError} class="uncaught">
                Uncaught Error
            </button>
            <button onclick={triggerUnhandledRejection} class="uncaught">
                Unhandled Rejection
            </button>
        </div>
        <p class="hint">ErrorBus features: deduplication, global capture, metadata</p>
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
        <p>Open browser console and try:</p>
        <ul>
            <li><code>window.__eventBus</code> - Access EventBus</li>
            <li><code>window.__errorBus</code> - Access ErrorBus</li>
            <li><code>window.__errorBus.reportFatal(new Error('Test'), 'Console')</code></li>
            <li><code>throw new Error('Test global capture')</code> - Will be caught by ErrorBus</li>
        </ul>
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
    
    .button-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.5rem;
        margin: 1rem 0;
    }
    
    button.recoverable {
        background: #FF9500;
    }
    
    button.recoverable:hover {
        background: #DB7F00;
    }
    
    button.fatal {
        background: #FF3B30;
    }
    
    button.fatal:hover {
        background: #D70015;
    }
    
    button.uncaught {
        background: #AF52DE;
    }
    
    button.uncaught:hover {
        background: #8E35BD;
    }
    
    .hint {
        font-size: 0.9rem;
        color: #666;
        font-style: italic;
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