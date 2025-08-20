/**
 * EventBus public API
 * 
 * This is the only file other bricks should import from EventBus
 */

export { EventBus } from './core/EventBus';
export { BaseEvent, type EventDetail, type EventMap } from './events';
export { AppReadyEvent, ErrorEvent, DebugModeEvent } from './events';
export type { AppEventMap } from './types/EventMap';