/**
 * StateBus - Shared reactive state coordinator
 * 
 * Following Essential Boss Rules:
 * - Rule 3 (Thin Wrapper): Thin coordination layer over Svelte's $state
 * - Rule 1 (Webby): Uses platform reactivity (Svelte 5)
 * - Rule 4 (LEGO): Only handles shared state, not all state
 * 
 * StateBus is NOT a global state manager. It's a coordination layer
 * for state that multiple bricks need to share. Each brick should
 * manage its own internal state with $state.
 * 
 * This file uses .svelte.ts extension to enable Svelte 5 runes
 */

import type { StateMap, StateValue } from '../models/StateMap';

/**
 * Internal storage for reactive state values
 */
class StateEntry<T = any> {
    value = $state<T | undefined>(undefined);
    
    constructor(initialValue?: T) {
        if (initialValue !== undefined) {
            this.value = initialValue;
        }
    }
}

/**
 * Reactive state accessor that components can use
 */
export interface StateAccessor<T> {
    get value(): T | undefined;
    set value(val: T | undefined);
}

export class StateBus {
    /**
     * Map of state keys to their reactive values
     */
    private states = new Map<keyof StateMap, StateEntry>();
    
    /**
     * Get a reactive state entry
     * Creates the state on first access (lazy initialization)
     * Returns the StateEntry which contains the reactive value
     * 
     * @param key - The state key from StateMap
     * @returns The reactive state entry
     */
    private getEntry<K extends keyof StateMap>(key: K): StateEntry<StateValue<K>> {
        if (!this.states.has(key)) {
            // Create reactive state on first access with undefined
            this.states.set(key, new StateEntry<StateValue<K>>());
        }
        
        return this.states.get(key) as StateEntry<StateValue<K>>;
    }
    
    /**
     * Get a reactive state value
     * Creates the state on first access (lazy initialization)
     * 
     * @param key - The state key from StateMap
     * @returns The reactive state value (can be undefined initially)
     */
    get<K extends keyof StateMap>(key: K): StateValue<K> | undefined {
        return this.getEntry(key).value;
    }
    
    /**
     * Set a state value
     * Creates the state if it doesn't exist
     * 
     * @param key - The state key from StateMap
     * @param value - The value to set
     */
    set<K extends keyof StateMap>(key: K, value: StateValue<K>): void {
        const entry = this.getEntry(key);
        entry.value = value;
    }
    
    /**
     * Check if a state key exists (has been accessed or set)
     * 
     * @param key - The state key to check
     * @returns true if the state has been initialized
     */
    has(key: keyof StateMap): boolean {
        return this.states.has(key);
    }
    
    /**
     * Delete a state key
     * Use sparingly - usually states should just be set to undefined
     * 
     * @param key - The state key to delete
     */
    delete(key: keyof StateMap): void {
        this.states.delete(key);
    }
    
    /**
     * Clear all states
     * Primarily for testing or hard resets
     */
    clear(): void {
        this.states.clear();
    }
    
    /**
     * Get all initialized state keys
     * Useful for debugging
     * 
     * @returns Array of state keys that have been accessed/set
     */
    keys(): (keyof StateMap)[] {
        return Array.from(this.states.keys());
    }
    
    /**
     * Get or create a state with a default value
     * Useful when you want to ensure a state exists
     * 
     * @param key - The state key
     * @param defaultValue - Value to use if state doesn't exist
     * @returns The state value (never undefined)
     */
    getOrCreate<K extends keyof StateMap>(key: K, defaultValue: StateValue<K>): StateValue<K> {
        const current = this.get(key);
        if (current === undefined) {
            this.set(key, defaultValue);
            return defaultValue;
        }
        return current;
    }
    
    /**
     * Update a state value using a function
     * Useful for derived updates
     * 
     * @param key - The state key
     * @param updater - Function that takes current value and returns new value
     */
    update<K extends keyof StateMap>(
        key: K, 
        updater: (current: StateValue<K> | undefined) => StateValue<K>
    ): void {
        const current = this.get(key);
        const newValue = updater(current);
        this.set(key, newValue);
    }
    
    /**
     * Get a reactive state accessor
     * This returns an object with reactive getters/setters
     * 
     * @param key - The state key
     * @returns A reactive accessor for the state
     */
    getState<K extends keyof StateMap>(key: K): StateAccessor<StateValue<K>> {
        const entry = this.getEntry(key);
        return {
            get value() {
                return entry.value;
            },
            set value(val: StateValue<K> | undefined) {
                entry.value = val;
            }
        };
    }
}