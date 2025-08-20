/**
 * DiscoveryBus - Build-time content discovery
 * 
 * Following Essential Boss Rules:
 * - Rule 1 (Webby): Uses Vite's import.meta.glob
 * - Rule 3 (Thin Wrapper): Minimal abstraction over glob imports
 * - Rule 2 (Five Buses): Standard connector for content discovery
 * 
 * DiscoveryBus provides a consistent API for discovering and loading
 * content files that are bundled at build time.
 */

import type { ModuleMap, ContentRegistry } from '../types/DiscoveryTypes';

export class DiscoveryBus {
    /**
     * Registry of content types and their module maps
     */
    private registry = new Map<string, ContentRegistry>();
    
    /**
     * Register a content type with its glob modules
     * 
     * @param type - The content type (e.g., 'themes', 'personas')
     * @param modules - The module map from import.meta.glob
     * 
     * @example
     * const themeModules = import.meta.glob('/aetherVault/themes/*.json');
     * discoveryBus.register('themes', themeModules);
     */
    register(type: string, modules: ModuleMap): void {
        this.registry.set(type, {
            modules,
            cache: new Map()
        });
    }
    
    /**
     * List all available IDs for a content type
     * 
     * @param type - The content type
     * @returns Array of content IDs
     * 
     * @example
     * discoveryBus.list('themes'); // ['rainy-night', 'nord', 'solarized-light']
     */
    list(type: string): string[] {
        const entry = this.registry.get(type);
        if (!entry) return [];
        
        return Object.keys(entry.modules).map(path => this.extractId(path));
    }
    
    /**
     * Load a specific content file
     * 
     * @param type - The content type
     * @param id - The content ID
     * @returns The loaded content or undefined if not found
     * 
     * @example
     * const theme = await discoveryBus.load<ThemeData>('themes', 'rainy-night');
     */
    async load<T = any>(type: string, id: string): Promise<T | undefined> {
        const entry = this.registry.get(type);
        if (!entry) return undefined;
        
        // Check cache first
        if (entry.cache.has(id)) {
            return entry.cache.get(id) as T;
        }
        
        // Find the module path that matches this ID
        const modulePath = Object.keys(entry.modules).find(
            path => this.extractId(path) === id
        );
        
        if (!modulePath) return undefined;
        
        try {
            // Load the module
            const module = await entry.modules[modulePath]();
            
            // Handle both default export and direct export
            const content = module.default || module;
            
            // Cache the content
            entry.cache.set(id, content);
            
            return content as T;
        } catch (error) {
            console.error(`DiscoveryBus: Failed to load ${type}/${id}`, error);
            return undefined;
        }
    }
    
    /**
     * Check if content exists
     * 
     * @param type - The content type
     * @param id - The content ID
     * @returns true if the content exists
     */
    has(type: string, id: string): boolean {
        const entry = this.registry.get(type);
        if (!entry) return false;
        
        return Object.keys(entry.modules).some(
            path => this.extractId(path) === id
        );
    }
    
    /**
     * Clear cache for a content type or all types
     * 
     * @param type - Optional content type to clear (clears all if not specified)
     */
    clearCache(type?: string): void {
        if (type) {
            const entry = this.registry.get(type);
            if (entry) {
                entry.cache.clear();
            }
        } else {
            // Clear all caches
            for (const entry of this.registry.values()) {
                entry.cache.clear();
            }
        }
    }
    
    /**
     * Extract clean ID from file path
     * 
     * @param path - The file path
     * @returns The extracted ID
     * 
     * @example
     * extractId('/aetherVault/themes/rainy-night.json') // 'rainy-night'
     * extractId('../../../aetherVault/personas/assistant.json') // 'assistant'
     */
    private extractId(path: string): string {
        // Get the filename without extension
        const filename = path.split('/').pop() || '';
        
        // Remove file extension
        const withoutExt = filename.replace(/\.[^/.]+$/, '');
        
        return withoutExt;
    }
}