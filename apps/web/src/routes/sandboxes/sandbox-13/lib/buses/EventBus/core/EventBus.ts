/**
 * EventBus - Thin wrapper around native EventTarget
 * 
 * Following Essential Boss Rules:
 * - Rule 1 (Webby): Uses native EventTarget, not custom pub/sub
 * - Rule 3 (Thin Wrapper): Minimal abstraction, just adds TypeScript types
 * - Rule 4 (LEGO): No dependencies on other bricks
 */

export class EventBus<T extends Record<string, any> = Record<string, any>> {
    private readonly target: EventTarget;
    
    constructor() {
        this.target = new EventTarget();
    }
    
    /**
     * Subscribe to an event
     * @param event Event name from the type map
     * @param handler Function to call when event fires
     * @returns Unsubscribe function
     */
    subscribe<K extends keyof T>(
        event: K,
        handler: (detail: T[K]) => void
    ): () => void {
        const listener = (e: Event) => {
            const customEvent = e as CustomEvent<T[K]>;
            handler(customEvent.detail);
        };
        
        this.target.addEventListener(event as string, listener);
        
        // Return unsubscribe function
        return () => {
            this.target.removeEventListener(event as string, listener);
        };
    }
    
    /**
     * Publish an event
     * @param event Event name from the type map
     * @param detail Event payload
     */
    publish<K extends keyof T>(event: K, detail: T[K]): void {
        const customEvent = new CustomEvent(event as string, { 
            detail,
            bubbles: false,
            cancelable: false
        });
        
        this.target.dispatchEvent(customEvent);
    }
    
    /**
     * Subscribe to an event, but only once
     * @param event Event name from the type map
     * @param handler Function to call when event fires
     * @returns Unsubscribe function (in case you want to cancel before it fires)
     */
    once<K extends keyof T>(
        event: K,
        handler: (detail: T[K]) => void
    ): () => void {
        const listener = (e: Event) => {
            const customEvent = e as CustomEvent<T[K]>;
            handler(customEvent.detail);
            this.target.removeEventListener(event as string, listener);
        };
        
        this.target.addEventListener(event as string, listener);
        
        return () => {
            this.target.removeEventListener(event as string, listener);
        };
    }
    
    /**
     * Remove all listeners for a specific event
     * Note: This only works for listeners added through this EventBus instance
     */
    clear<K extends keyof T>(event: K): void {
        // Native EventTarget doesn't provide a way to remove all listeners
        // This would require tracking listeners ourselves, which violates
        // Rule 3 (Thin Wrapper). Users should track their own unsubscribe functions.
        console.warn('EventBus.clear() not implemented - track your own unsubscribe functions');
    }
    
    /**
     * Get the underlying EventTarget for advanced use cases
     * Following Rule 3: Platform behavior shines through
     */
    getTarget(): EventTarget {
        return this.target;
    }
}