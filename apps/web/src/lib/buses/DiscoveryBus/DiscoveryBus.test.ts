/**
 * DiscoveryBus unit tests
 * 
 * Testing build-time content discovery functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryBus } from './core/DiscoveryBus';
import type { ModuleMap } from './types/DiscoveryTypes';

describe('DiscoveryBus', () => {
    let discoveryBus: DiscoveryBus;
    
    beforeEach(() => {
        discoveryBus = new DiscoveryBus();
    });
    
    describe('Registration', () => {
        it('should register content types', () => {
            const mockModules: ModuleMap = {
                '/aetherVault/themes/dark.json': vi.fn(),
                '/aetherVault/themes/light.json': vi.fn()
            };
            
            discoveryBus.register('themes', mockModules);
            
            const themes = discoveryBus.list('themes');
            expect(themes).toContain('dark');
            expect(themes).toContain('light');
        });
        
        it('should handle empty module maps', () => {
            discoveryBus.register('empty', {});
            
            const items = discoveryBus.list('empty');
            expect(items).toEqual([]);
        });
        
        it('should overwrite existing registration', () => {
            const firstModules: ModuleMap = {
                '/aetherVault/themes/old.json': vi.fn()
            };
            
            const secondModules: ModuleMap = {
                '/aetherVault/themes/new.json': vi.fn()
            };
            
            discoveryBus.register('themes', firstModules);
            discoveryBus.register('themes', secondModules);
            
            const themes = discoveryBus.list('themes');
            expect(themes).toEqual(['new']);
            expect(themes).not.toContain('old');
        });
    });
    
    describe('Listing', () => {
        it('should list all IDs for a content type', () => {
            const mockModules: ModuleMap = {
                '/aetherVault/themes/rainy-night.json': vi.fn(),
                '/aetherVault/themes/nord.json': vi.fn(),
                '/aetherVault/themes/solarized-light.json': vi.fn()
            };
            
            discoveryBus.register('themes', mockModules);
            
            const themes = discoveryBus.list('themes');
            expect(themes).toEqual(['rainy-night', 'nord', 'solarized-light']);
        });
        
        it('should return empty array for unregistered type', () => {
            const items = discoveryBus.list('nonexistent');
            expect(items).toEqual([]);
        });
        
        it('should extract IDs correctly from various path formats', () => {
            const mockModules: ModuleMap = {
                '/aetherVault/themes/theme-1.json': vi.fn(),
                '../../../aetherVault/themes/theme_2.json': vi.fn(),
                './themes/theme.3.json': vi.fn(),
                'theme-4.config.json': vi.fn()
            };
            
            discoveryBus.register('themes', mockModules);
            
            const themes = discoveryBus.list('themes');
            expect(themes).toContain('theme-1');
            expect(themes).toContain('theme_2');
            expect(themes).toContain('theme.3');
            expect(themes).toContain('theme-4.config');
        });
    });
    
    describe('Loading', () => {
        it('should load content', async () => {
            const mockContent = { id: 'dark', name: 'Dark Theme' };
            const mockLoader = vi.fn().mockResolvedValue({ default: mockContent });
            
            const mockModules: ModuleMap = {
                '/aetherVault/themes/dark.json': mockLoader
            };
            
            discoveryBus.register('themes', mockModules);
            
            const content = await discoveryBus.load('themes', 'dark');
            expect(content).toEqual(mockContent);
            expect(mockLoader).toHaveBeenCalledTimes(1);
        });
        
        it('should cache loaded content', async () => {
            const mockContent = { id: 'dark', name: 'Dark Theme' };
            const mockLoader = vi.fn().mockResolvedValue({ default: mockContent });
            
            const mockModules: ModuleMap = {
                '/aetherVault/themes/dark.json': mockLoader
            };
            
            discoveryBus.register('themes', mockModules);
            
            // Load twice
            const content1 = await discoveryBus.load('themes', 'dark');
            const content2 = await discoveryBus.load('themes', 'dark');
            
            expect(content1).toBe(content2); // Same reference
            expect(mockLoader).toHaveBeenCalledTimes(1); // Only loaded once
        });
        
        it('should handle direct export (no default)', async () => {
            const mockContent = { id: 'light', name: 'Light Theme' };
            const mockLoader = vi.fn().mockResolvedValue(mockContent); // No .default
            
            const mockModules: ModuleMap = {
                '/aetherVault/themes/light.json': mockLoader
            };
            
            discoveryBus.register('themes', mockModules);
            
            const content = await discoveryBus.load('themes', 'light');
            expect(content).toEqual(mockContent);
        });
        
        it('should return undefined for missing content', async () => {
            discoveryBus.register('themes', {});
            
            const content = await discoveryBus.load('themes', 'nonexistent');
            expect(content).toBeUndefined();
        });
        
        it('should return undefined for unregistered type', async () => {
            const content = await discoveryBus.load('unregistered', 'anything');
            expect(content).toBeUndefined();
        });
        
        it('should handle load errors gracefully', async () => {
            const mockLoader = vi.fn().mockRejectedValue(new Error('Load failed'));
            
            const mockModules: ModuleMap = {
                '/aetherVault/themes/broken.json': mockLoader
            };
            
            discoveryBus.register('themes', mockModules);
            
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            const content = await discoveryBus.load('themes', 'broken');
            expect(content).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith(
                'DiscoveryBus: Failed to load themes/broken',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('Existence checking', () => {
        it('should check if content exists', () => {
            const mockModules: ModuleMap = {
                '/aetherVault/themes/dark.json': vi.fn(),
                '/aetherVault/themes/light.json': vi.fn()
            };
            
            discoveryBus.register('themes', mockModules);
            
            expect(discoveryBus.has('themes', 'dark')).toBe(true);
            expect(discoveryBus.has('themes', 'light')).toBe(true);
            expect(discoveryBus.has('themes', 'nonexistent')).toBe(false);
        });
        
        it('should return false for unregistered type', () => {
            expect(discoveryBus.has('unregistered', 'anything')).toBe(false);
        });
    });
    
    describe('Cache management', () => {
        it('should clear cache for specific type', async () => {
            const mockContent = { id: 'dark', name: 'Dark Theme' };
            const mockLoader = vi.fn().mockResolvedValue({ default: mockContent });
            
            const mockModules: ModuleMap = {
                '/aetherVault/themes/dark.json': mockLoader
            };
            
            discoveryBus.register('themes', mockModules);
            
            // Load and cache
            await discoveryBus.load('themes', 'dark');
            expect(mockLoader).toHaveBeenCalledTimes(1);
            
            // Clear cache
            discoveryBus.clearCache('themes');
            
            // Load again - should call loader again
            await discoveryBus.load('themes', 'dark');
            expect(mockLoader).toHaveBeenCalledTimes(2);
        });
        
        it('should clear all caches', async () => {
            const themeLoader = vi.fn().mockResolvedValue({ default: { id: 'dark' } });
            const personaLoader = vi.fn().mockResolvedValue({ default: { id: 'assistant' } });
            
            discoveryBus.register('themes', {
                '/aetherVault/themes/dark.json': themeLoader
            });
            
            discoveryBus.register('personas', {
                '/aetherVault/personas/assistant.json': personaLoader
            });
            
            // Load both
            await discoveryBus.load('themes', 'dark');
            await discoveryBus.load('personas', 'assistant');
            
            expect(themeLoader).toHaveBeenCalledTimes(1);
            expect(personaLoader).toHaveBeenCalledTimes(1);
            
            // Clear all caches
            discoveryBus.clearCache();
            
            // Load again - should call loaders again
            await discoveryBus.load('themes', 'dark');
            await discoveryBus.load('personas', 'assistant');
            
            expect(themeLoader).toHaveBeenCalledTimes(2);
            expect(personaLoader).toHaveBeenCalledTimes(2);
        });
        
        it('should handle clearing cache for non-existent type', () => {
            // Should not throw
            expect(() => discoveryBus.clearCache('nonexistent')).not.toThrow();
        });
    });
    
    describe('Type safety', () => {
        it('should preserve types when loading', async () => {
            interface ThemeData {
                id: string;
                name: string;
                colors: Record<string, string>;
            }
            
            const mockTheme: ThemeData = {
                id: 'typed',
                name: 'Typed Theme',
                colors: { primary: '#000' }
            };
            
            discoveryBus.register('themes', {
                '/aetherVault/themes/typed.json': vi.fn().mockResolvedValue({ default: mockTheme })
            });
            
            const theme = await discoveryBus.load<ThemeData>('themes', 'typed');
            
            // TypeScript should recognize these properties
            expect(theme?.id).toBe('typed');
            expect(theme?.name).toBe('Typed Theme');
            expect(theme?.colors.primary).toBe('#000');
        });
    });
});