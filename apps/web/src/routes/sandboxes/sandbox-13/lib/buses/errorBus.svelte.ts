/**
 * Global ErrorBus instance
 * 
 * Using Svelte 5's universal reactivity (.svelte.ts file)
 * ErrorBus is a facade over EventBus for error-specific operations
 * 
 * Following Rule 2 (Four Buses): This is one of the four standard connectors
 */

import { ErrorBus } from './ErrorBus';
import { eventBus } from './eventBus.svelte';
import type { ErrorBusConfig } from './ErrorBus';

// Default configuration following Rule 8 (No Hardcoding)
// In production, this would be loaded from ConfigBus
const defaultConfig: ErrorBusConfig = {
    captureGlobalErrors: true,
    captureUnhandledRejections: true,
    logToConsole: true,
    deduplication: {
        enabled: true,
        windowMs: 100
    }
};

// Create the global instance with config
export const errorBus = new ErrorBus(eventBus, defaultConfig);

// In development, expose to window for debugging
// Following Rule 1 (Webby): Browser DevTools integration
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as any).__errorBus = errorBus;
    console.log('ErrorBus available at window.__errorBus for debugging');
}