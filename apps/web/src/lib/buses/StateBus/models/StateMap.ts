/**
 * StateMap - Type-safe keys for shared state
 * 
 * Following Essential Boss Rules:
 * - Rule 8 (No Hardcoding): All state keys must be declared here
 * - Rule 4 (LEGO): Each brick extends this with its own state keys
 * 
 * Bricks extend this interface via module augmentation:
 * 
 * declare module '$lib/buses/StateBus/models/StateMap' {
 *   interface StateMap {
 *     'myBrick:someValue': string;
 *     'myBrick:isLoading': boolean;
 *   }
 * }
 */

/**
 * Global state map that bricks extend
 * Use namespaced keys like 'brickName:stateName'
 */
export interface StateMap {
    // Core application states
    'app:initialized': boolean;
    'app:theme': 'light' | 'dark' | 'auto';
    'app:locale': string;
    
    // Debug states
    'debug:enabled': boolean;
    'debug:verbose': boolean;
}

/**
 * Helper type to get the value type for a state key
 */
export type StateValue<K extends keyof StateMap> = StateMap[K];

/**
 * Helper type for state change handlers
 */
export type StateChangeHandler<K extends keyof StateMap> = (value: StateMap[K]) => void;