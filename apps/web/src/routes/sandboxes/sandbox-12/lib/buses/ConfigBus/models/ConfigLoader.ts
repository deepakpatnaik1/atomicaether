/**
 * ConfigLoader - Strategies for loading configuration
 * 
 * Following Essential Boss Rules:
 * - Rule 1 (Webby): Uses platform features (fetch, dynamic imports)
 * - Rule 3 (Thin Wrapper): Minimal abstraction over native APIs
 */

/**
 * Base interface for config loading strategies
 */
export interface ConfigLoader {
    load<T>(path: string): Promise<T>;
}

/**
 * Runtime config loader using fetch
 * Used in development for hot reload capability
 */
export class RuntimeConfigLoader implements ConfigLoader {
    constructor(private basePath = '/config') {}
    
    async load<T>(path: string): Promise<T> {
        const url = `${this.basePath}/${path}.json`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to load config from ${url}: ${response.statusText}`);
            }
            
            const text = await response.text();
            const processed = this.substituteEnvVars(text);
            return JSON.parse(processed);
        } catch (error) {
            console.error(`ConfigBus: Failed to load ${path}`, error);
            throw error;
        }
    }
    
    /**
     * Substitute environment variables in config text
     * Supports ${VAR_NAME:-default_value} syntax
     */
    private substituteEnvVars(text: string): string {
        return text.replace(
            /\$\{([^:}]+)(?::([^}]+))?\}/g,
            (match, varName, defaultValue) => {
                // Check import.meta.env first, then process.env for Node compatibility
                const value = import.meta.env[varName] ?? 
                             (typeof process !== 'undefined' ? process.env[varName] : undefined);
                
                if (value !== undefined) {
                    return String(value);
                }
                
                if (defaultValue !== undefined) {
                    return defaultValue;
                }
                
                console.warn(`ConfigBus: Environment variable ${varName} not found, no default provided`);
                return '';
            }
        );
    }
}

/**
 * Build-time config loader using dynamic imports
 * Used in production for bundled configs
 */
export class BuildTimeConfigLoader implements ConfigLoader {
    async load<T>(path: string): Promise<T> {
        try {
            // Dynamic import from aetherVault
            // Vite will bundle these at build time
            const module = await import(`../../../../../aetherVault/config/${path}.json`);
            
            // Handle both default export and direct export
            const config = module.default || module;
            
            // Process env vars even in bundled configs
            const configText = JSON.stringify(config);
            const processed = this.substituteEnvVars(configText);
            return JSON.parse(processed);
        } catch (error) {
            console.error(`ConfigBus: Failed to import ${path}`, error);
            throw error;
        }
    }
    
    /**
     * Substitute environment variables in config text
     * Even bundled configs can use runtime env vars
     */
    private substituteEnvVars(text: string): string {
        return text.replace(
            /\$\{([^:}]+)(?::([^}]+))?\}/g,
            (match, varName, defaultValue) => {
                const value = import.meta.env[varName];
                
                if (value !== undefined) {
                    return String(value);
                }
                
                if (defaultValue !== undefined) {
                    return defaultValue;
                }
                
                console.warn(`ConfigBus: Environment variable ${varName} not found, no default provided`);
                return '';
            }
        );
    }
}