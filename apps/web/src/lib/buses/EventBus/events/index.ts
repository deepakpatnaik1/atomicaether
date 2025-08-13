/**
 * Common system events that any brick can use
 * 
 * Following Rule 4 (LEGO): These are standard events that enable
 * brick composition without direct dependencies
 */

import { BaseEvent } from './BaseEvent';

/**
 * Fired when the app is ready and all core buses are initialized
 */
export class AppReadyEvent extends BaseEvent<{
    timestamp: number;
}> {
    static readonly type = 'AppReadyEvent';
}

/**
 * Fired when an error occurs that should be handled globally
 */
export class ErrorEvent extends BaseEvent<{
    error: Error;
    source?: string;
    recoverable?: boolean;
}> {
    static readonly type = 'ErrorEvent';
}

/**
 * Fired when debug mode changes
 */
export class DebugModeEvent extends BaseEvent<{
    enabled: boolean;
}> {
    static readonly type = 'DebugModeEvent';
}

// Re-export base class
export { BaseEvent, type EventDetail, type EventMap } from './BaseEvent';