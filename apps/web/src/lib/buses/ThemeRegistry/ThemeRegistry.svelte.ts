import { discoveryBus } from '$lib/buses';
import type { Theme } from './types.js';

class ThemeRegistry {
  private themes = new Map<string, Theme>();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Register theme modules with DiscoveryBus
    // Uses absolute path that works reliably (from field report lesson #1)
    const modules = import.meta.glob('/src/themes/*.json');
    discoveryBus.register('themes', modules);
    
    this.initialized = true;
  }

  async getThemes(): Promise<string[]> {
    await this.initialize();
    return discoveryBus.list('themes');
  }

  async getTheme(name: string): Promise<Theme> {
    await this.initialize();
    
    if (this.themes.has(name)) {
      return this.themes.get(name)!;
    }
    
    const theme = await discoveryBus.load<Theme>('themes', name);
    if (!theme) {
      throw new Error(`Theme not found: ${name}`);
    }
    
    this.themes.set(name, theme);
    return theme;
  }

  async hasTheme(name: string): Promise<boolean> {
    await this.initialize();
    return discoveryBus.has('themes', name);
  }

  clearCache(): void {
    this.themes.clear();
    discoveryBus.clearCache('themes');
  }
}

export const themeRegistry = new ThemeRegistry();