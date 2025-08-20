/**
 * ConfigMap - Type registry for all configuration files
 * 
 * Following Essential Boss Rules:
 * - Rule 8 (No Hardcoding): All configuration externalized
 * - Rule 4 (LEGO): Each brick extends this with its config types
 * 
 * Bricks extend this interface via module augmentation:
 * 
 * declare module '$lib/buses/ConfigBus/models/ConfigMap' {
 *   interface ConfigMap {
 *     'myBrick': MyBrickConfig;
 *   }
 * }
 */

/**
 * Global configuration map that bricks extend
 * Keys should match JSON filenames in aetherVault/config/
 */
export interface ConfigMap {
    // Core bus configurations
    'eventBus': {
        debug: {
            enabled: boolean;
            logEvents: boolean;
            logSubscriptions: boolean;
        };
        performance: {
            maxListenersWarning: number;
        };
    };
    
    'errorBus': {
        captureGlobalErrors: boolean;
        captureUnhandledRejections: boolean;
        logToConsole: boolean;
        deduplication: {
            enabled: boolean;
            windowMs: number;
        };
    };
    
    // App-level configurations
    'app': {
        name: string;
        version: string;
        environment: string;
        features: Record<string, boolean>;
    };
}

/**
 * Helper type to get config type for a key
 */
export type ConfigValue<K extends keyof ConfigMap> = ConfigMap[K];

/**
 * Configuration loading options
 */
export interface ConfigOptions {
    /**
     * Force reload even if cached
     */
    forceReload?: boolean;
    
    /**
     * Custom base path for configs (defaults to /config in dev, bundled in prod)
     */
    basePath?: string;
    
    /**
     * Enable hot reload watching (dev only)
     */
    watch?: boolean;
    
    /**
     * Default value to use if config file is missing
     */
    default?: any;
}