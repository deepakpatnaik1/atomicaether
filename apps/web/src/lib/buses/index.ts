/**
 * Central export for all buses
 * 
 * Following Rule 2 (Four Buses): EventBus, ConfigBus, StateBus, ErrorBus
 * Currently only EventBus is implemented
 */

// Export the global EventBus instance
export { eventBus } from './eventBus.svelte';

// Export EventBus types and utilities
export { 
    EventBus,
    BaseEvent,
    AppReadyEvent,
    ErrorEvent,
    DebugModeEvent,
    type EventDetail,
    type EventMap,
    type AppEventMap
} from './EventBus';