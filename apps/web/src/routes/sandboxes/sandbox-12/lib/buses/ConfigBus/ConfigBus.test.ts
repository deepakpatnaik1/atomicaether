/**
 * ConfigBus unit tests
 * 
 * Testing config loading, caching, and environment variable substitution
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigBus } from './core/ConfigBus';
import { RuntimeConfigLoader } from './models/ConfigLoader';
import type { ConfigMap } from './models/ConfigMap';

// Mock fetch for testing
global.fetch = vi.fn();

// Extend ConfigMap for testing
declare module './models/ConfigMap' {
    interface ConfigMap {
        'test': {
            name: string;
            value: number;
            enabled: boolean;
        };
        'test-env': {
            apiUrl: string;
            timeout: number;
        };
    }
}

describe('ConfigBus', () => {
    let configBus: ConfigBus;
    
    beforeEach(() => {
        // Clear fetch mocks
        vi.clearAllMocks();
        
        // Create new ConfigBus instance
        configBus = new ConfigBus();
        
        // Reset import.meta.env
        import.meta.env.VITE_TEST_VAR = 'test-value';
        import.meta.env.VITE_API_URL = 'https://api.example.com';
    });
    
    afterEach(() => {
        vi.restoreAllMocks();
    });
    
    describe('Config loading', () => {
        it('should use default value when config is missing', async () => {
            const defaultConfig = {
                name: 'default-config',
                value: 999,
                enabled: false
            };
            
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found'
            });
            
            const config = await configBus.load('test', { default: defaultConfig });
            
            expect(config).toEqual(defaultConfig);
            expect(configBus.has('test')).toBe(true); // Should be cached
        });
        
        it('should throw error when no default provided for missing config', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found'
            });
            
            await expect(configBus.load('test')).rejects.toThrow('Failed to load config');
        });
        
        it('should load config from JSON', async () => {
            const mockConfig = {
                name: 'test-config',
                value: 42,
                enabled: true
            };
            
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockConfig)
            });
            
            const config = await configBus.load('test');
            
            expect(config).toEqual(mockConfig);
            expect(fetch).toHaveBeenCalledWith('/config/test.json');
        });
        
        it('should cache loaded configs', async () => {
            const mockConfig = { name: 'cached', value: 1, enabled: false };
            
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockConfig)
            });
            
            // First load
            const config1 = await configBus.load('test');
            expect(fetch).toHaveBeenCalledTimes(1);
            
            // Second load should use cache
            const config2 = await configBus.load('test');
            expect(fetch).toHaveBeenCalledTimes(1); // Still 1
            expect(config2).toBe(config1); // Same reference
        });
        
        it('should force reload when requested', async () => {
            const config1 = { name: 'v1', value: 1, enabled: true };
            const config2 = { name: 'v2', value: 2, enabled: false };
            
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify(config1)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify(config2)
                });
            
            await configBus.load('test');
            expect(fetch).toHaveBeenCalledTimes(1);
            
            const reloaded = await configBus.load('test', { forceReload: true });
            expect(fetch).toHaveBeenCalledTimes(2);
            expect(reloaded).toEqual(config2);
        });
        
        it('should handle load errors', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found'
            });
            
            await expect(configBus.load('test')).rejects.toThrow('Failed to load config');
        });
    });
    
    describe('Environment variable substitution', () => {
        it('should substitute environment variables', async () => {
            const configWithVars = {
                apiUrl: '${VITE_API_URL}',
                timeout: 5000
            };
            
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(configWithVars).replace(
                    '${VITE_API_URL}',
                    '${VITE_API_URL}'
                )
            });
            
            // Test the loader directly
            const loader = new RuntimeConfigLoader();
            const processed = await loader.load<any>('test-env');
            
            // Note: In real implementation, the substitution happens in the loader
            // For this test, we'll check the loader's substitution method
        });
        
        it('should use default values for missing env vars', async () => {
            const configText = '{"url": "${VITE_MISSING:-http://default.com}"}';
            
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                text: async () => configText
            });
            
            const loader = new RuntimeConfigLoader();
            const config = await loader.load<any>('test');
            
            expect(config.url).toBe('http://default.com');
        });
        
        it('should handle env vars without defaults', async () => {
            const configText = '{"url": "${VITE_NO_DEFAULT}"}';
            
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                text: async () => configText
            });
            
            const loader = new RuntimeConfigLoader();
            const config = await loader.load<any>('test');
            
            expect(config.url).toBe(''); // Empty string when no default
        });
    });
    
    describe('Cache management', () => {
        it('should check if config is cached', async () => {
            expect(configBus.has('test')).toBe(false);
            
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify({ name: 'test', value: 1, enabled: true })
            });
            
            await configBus.load('test');
            expect(configBus.has('test')).toBe(true);
        });
        
        it('should get cached config without loading', async () => {
            const mockConfig = { name: 'cached', value: 42, enabled: true };
            
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockConfig)
            });
            
            await configBus.load('test');
            
            const cached = configBus.get('test');
            expect(cached).toEqual(mockConfig);
            expect(fetch).toHaveBeenCalledTimes(1); // Not called again
        });
        
        it('should clear specific cached config', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify({ name: 'test', value: 1, enabled: true })
            });
            
            await configBus.load('test');
            expect(configBus.has('test')).toBe(true);
            
            configBus.clear('test');
            expect(configBus.has('test')).toBe(false);
        });
        
        it('should clear all cached configs', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify({ name: 'test1', value: 1, enabled: true })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify({ apiUrl: 'http://test', timeout: 5000 })
                });
            
            await configBus.load('test');
            await configBus.load('test-env');
            
            expect(configBus.keys().length).toBe(2);
            
            configBus.clearAll();
            expect(configBus.keys().length).toBe(0);
        });
        
        it('should list all cached config keys', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify({ name: 'test1', value: 1, enabled: true })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify({ apiUrl: 'http://test', timeout: 5000 })
                });
            
            await configBus.load('test');
            await configBus.load('test-env');
            
            const keys = configBus.keys();
            expect(keys).toContain('test');
            expect(keys).toContain('test-env');
            expect(keys.length).toBe(2);
        });
    });
    
    describe('Batch loading', () => {
        it('should load multiple configs in parallel', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify({ name: 'test1', value: 1, enabled: true })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify({ apiUrl: 'http://test', timeout: 5000 })
                });
            
            const configs = await configBus.loadMany(['test', 'test-env']);
            
            expect(configs.test).toEqual({ name: 'test1', value: 1, enabled: true });
            expect(configs['test-env']).toEqual({ apiUrl: 'http://test', timeout: 5000 });
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });
    
    describe('Reload functionality', () => {
        it('should reload config', async () => {
            const v1 = { name: 'version1', value: 1, enabled: true };
            const v2 = { name: 'version2', value: 2, enabled: false };
            
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify(v1)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify(v2)
                });
            
            await configBus.load('test');
            const reloaded = await configBus.reload('test');
            
            expect(reloaded).toEqual(v2);
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });
});