/**
 * Global EventBus instance
 * 
 * Using Svelte 5's universal reactivity (.svelte.ts file)
 * This creates a singleton that can be imported anywhere in the app
 * 
 * Following Rule 2 (Four Buses): This is one of the four standard connectors
 */

import { EventBus } from './EventBus';
import type { AppEventMap } from './EventBus/types/EventMap';

// Create the global instance
export const eventBus = new EventBus<AppEventMap>();

// In development, expose to window for debugging
// Following Rule 1 (Webby): Browser DevTools integration
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as any).__eventBus = eventBus;
    console.log('EventBus available at window.__eventBus for debugging');
}