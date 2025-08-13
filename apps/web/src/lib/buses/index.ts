/**
 * Central export for all buses
 * 
 * Following Rule 2 (Four Buses): EventBus, ConfigBus, StateBus, ErrorBus
 * Currently EventBus, ErrorBus, and StateBus are implemented
 */

// Export the global bus instances
export { eventBus } from './eventBus.svelte';
export { errorBus } from './errorBus.svelte';
export { stateBus } from './stateBus.svelte';

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

// Export ErrorBus types
export {
    ErrorBus,
    type ErrorContext,
    type ErrorBusConfig
} from './ErrorBus';

// Export StateBus types
export {
    StateBus,
    type StateMap,
    type StateValue,
    type StateChangeHandler
} from './StateBus';