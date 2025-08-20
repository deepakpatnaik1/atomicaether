/**
 * DiscoveryBus Type Definitions
 * 
 * Following Essential Boss Rules:
 * - Rule 1 (Webby): Types for Vite's import.meta.glob
 * - Rule 3 (Thin Wrapper): Minimal types over native functionality
 */

/**
 * Module map returned by import.meta.glob
 * Maps file paths to lazy import functions
 */
export type ModuleMap = Record<string, () => Promise<any>>;

/**
 * Internal registry entry for a content type
 */
export interface ContentRegistry {
    modules: ModuleMap;
    cache: Map<string, any>;
}

/**
 * Options for future extensibility
 */
export interface DiscoveryOptions {
    /** Whether to cache loaded content (default: true) */
    cache?: boolean;
}