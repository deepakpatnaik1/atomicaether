/**
 * Global DiscoveryBus instance
 * 
 * The fifth standard bus for build-time content discovery
 */

import { DiscoveryBus } from './DiscoveryBus/core/DiscoveryBus';

// Create and export the global instance
export const discoveryBus = new DiscoveryBus();

// Development mode helpers
if (import.meta.env.DEV) {
    // Expose for debugging
    if (typeof window !== 'undefined') {
        (window as any).__discoveryBus = discoveryBus;
    }
}