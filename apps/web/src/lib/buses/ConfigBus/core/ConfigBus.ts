/**
 * ConfigBus - Type-safe configuration loader
 * 
 * Following Essential Boss Rules:
 * - Rule 8 (No Hardcoding): Enables all configuration to be externalized
 * - Rule 3 (Thin Wrapper): Thin layer over fetch/import
 * - Rule 1 (Webby): Uses platform features (Vite, fetch)
 * 
 * ConfigBus loads JSON configuration files with:
 * - Type safety via TypeScript
 * - Environment variable substitution
 * - Runtime loading in dev (hot reload)
 * - Build-time bundling in prod (performance)
 */

import type { ConfigMap, ConfigValue, ConfigOptions } from '../models/ConfigMap';
import { RuntimeConfigLoader, BuildTimeConfigLoader, type ConfigLoader } from '../models/ConfigLoader';
import type { EventBus } from '../../EventBus';

export class ConfigBus {
    /**
     * Cache of loaded configurations
     */
    private cache = new Map<keyof ConfigMap, any>();
    
    /**
     * Configuration loader strategy
     */
    private loader: ConfigLoader;
    
    /**
     * Optional EventBus for config change notifications
     */
    private eventBus?: EventBus;
    
    /**
     * Track watched config files (dev only)
     */
    private watchedConfigs = new Set<keyof ConfigMap>();
    
    constructor(eventBus?: EventBus) {
        this.eventBus = eventBus;
        
        // Choose loader based on environment
        if (import.meta.env.DEV) {
            // Runtime loading for development (hot reload)
            this.loader = new RuntimeConfigLoader();
            this.setupHotReload();
        } else {
            // Build-time imports for production (bundled)
            this.loader = new BuildTimeConfigLoader();
        }
    }
    
    /**
     * Load a configuration file
     * 
     * @param key - The config key from ConfigMap
     * @param options - Loading options
     * @returns The typed configuration object
     */
    async load<K extends keyof ConfigMap>(
        key: K,
        options: ConfigOptions = {}
    ): Promise<ConfigValue<K>> {
        // Check cache unless force reload requested
        if (!options.forceReload && this.cache.has(key)) {
            return this.cache.get(key)!;
        }
        
        try {
            // Load the configuration
            const config = await this.loader.load<ConfigValue<K>>(String(key));
            
            // Cache the result
            this.cache.set(key, config);
            
            // Set up watching if requested (dev only)
            if (import.meta.env.DEV && options.watch) {
                this.watchedConfigs.add(key);
            }
            
            // Notify listeners of successful load
            if (this.eventBus) {
                this.eventBus.publish('config:loaded', {
                    key,
                    config
                });
            }
            
            return config;
        } catch (error) {
            // Notify listeners of load failure
            if (this.eventBus) {
                this.eventBus.publish('config:error', {
                    key,
                    error
                });
            }
            
            throw error;
        }
    }
    
    /**
     * Get a cached configuration without loading
     * 
     * @param key - The config key
     * @returns The cached config or undefined
     */
    get<K extends keyof ConfigMap>(key: K): ConfigValue<K> | undefined {
        return this.cache.get(key);
    }
    
    /**
     * Check if a configuration is cached
     * 
     * @param key - The config key
     * @returns true if cached
     */
    has(key: keyof ConfigMap): boolean {
        return this.cache.has(key);
    }
    
    /**
     * Clear a cached configuration
     * 
     * @param key - The config key to clear
     */
    clear(key: keyof ConfigMap): void {
        this.cache.delete(key);
        
        if (this.eventBus) {
            this.eventBus.publish('config:cleared', { key });
        }
    }
    
    /**
     * Clear all cached configurations
     */
    clearAll(): void {
        this.cache.clear();
        
        if (this.eventBus) {
            this.eventBus.publish('config:cleared', { key: null });
        }
    }
    
    /**
     * Reload a configuration
     * 
     * @param key - The config key to reload
     * @returns The reloaded configuration
     */
    async reload<K extends keyof ConfigMap>(key: K): Promise<ConfigValue<K>> {
        return this.load(key, { forceReload: true });
    }
    
    /**
     * Get all cached configuration keys
     * 
     * @returns Array of cached config keys
     */
    keys(): (keyof ConfigMap)[] {
        return Array.from(this.cache.keys());
    }
    
    /**
     * Set up hot reload for development
     * Uses Vite's HMR to watch config files
     */
    private setupHotReload(): void {
        if (!import.meta.env.DEV) return;
        
        // Listen for HMR updates
        if (import.meta.hot) {
            import.meta.hot.on('config-update', async (data: { key: keyof ConfigMap }) => {
                if (this.watchedConfigs.has(data.key)) {
                    console.log(`ConfigBus: Hot reloading ${data.key}`);
                    
                    try {
                        await this.reload(data.key);
                        
                        if (this.eventBus) {
                            this.eventBus.publish('config:reloaded', {
                                key: data.key,
                                config: this.cache.get(data.key)
                            });
                        }
                    } catch (error) {
                        console.error(`ConfigBus: Failed to hot reload ${data.key}`, error);
                    }
                }
            });
        }
    }
    
    /**
     * Load multiple configurations in parallel
     * 
     * @param keys - Array of config keys to load
     * @returns Object with loaded configs
     */
    async loadMany<K extends keyof ConfigMap>(
        keys: K[]
    ): Promise<{ [P in K]: ConfigValue<P> }> {
        const promises = keys.map(key => 
            this.load(key).then(config => ({ key, config }))
        );
        
        const results = await Promise.all(promises);
        
        return results.reduce((acc, { key, config }) => {
            acc[key] = config;
            return acc;
        }, {} as { [P in K]: ConfigValue<P> });
    }
}