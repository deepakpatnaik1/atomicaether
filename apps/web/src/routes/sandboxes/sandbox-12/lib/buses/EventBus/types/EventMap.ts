/**
 * Application-wide event type map
 * 
 * This centralizes all event types for type safety across the app.
 * Each brick can extend this via TypeScript module augmentation.
 * 
 * Following Rule 4 (LEGO): Bricks declare their events here without
 * knowing about each other - just the event contract.
 */

// Import system events
import type { 
    AppReadyEvent,
    ErrorEvent,
    DebugModeEvent
} from '../events';

/**
 * Core application event map
 * Bricks will augment this interface to add their own events
 */
export interface AppEventMap {
    // System events
    'app:ready': {
        timestamp: number;
    };
    'error': {
        error: Error;
        source?: string;
        recoverable?: boolean;
    };
    'debug:mode': {
        enabled: boolean;
    };
}

/**
 * Module augmentation example for bricks:
 * 
 * declare module '$lib/buses/EventBus/types/EventMap' {
 *     interface AppEventMap {
 *         'persona:changed': {
 *             persona: string;
 *             previousPersona?: string;
 *         };
 *     }
 * }
 */