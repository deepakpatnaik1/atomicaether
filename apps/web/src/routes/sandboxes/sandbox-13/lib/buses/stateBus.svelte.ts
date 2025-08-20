/**
 * Global StateBus instance
 * 
 * Using Svelte 5's universal reactivity (.svelte.ts file)
 * StateBus coordinates shared reactive state between bricks
 * 
 * Following Rule 2 (Four Buses): This is one of the four standard connectors
 */

import { StateBus } from './StateBus';

// Create the global instance
export const stateBus = new StateBus();

// In development, expose to window for debugging
// Following Rule 1 (Webby): Browser DevTools integration
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as any).__stateBus = stateBus;
    console.log('StateBus available at window.__stateBus for debugging');
}