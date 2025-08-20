/**
 * Global ConfigBus instance
 * 
 * Using Svelte 5's universal reactivity (.svelte.ts file)
 * ConfigBus loads type-safe JSON configurations
 * 
 * Following Rule 2 (Four Buses): This is one of the four standard connectors
 * Following Rule 8 (No Hardcoding): Enables all config to be externalized
 */

import { ConfigBus } from './ConfigBus';
import { eventBus } from './eventBus.svelte';

// Create the global instance with EventBus for notifications
export const configBus = new ConfigBus(eventBus);

// In development, expose to window for debugging
// Following Rule 1 (Webby): Browser DevTools integration
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as any).__configBus = configBus;
    console.log('ConfigBus available at window.__configBus for debugging');
}