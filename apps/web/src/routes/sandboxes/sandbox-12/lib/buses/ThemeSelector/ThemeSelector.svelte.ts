import { stateBus, eventBus, themeRegistry } from '$lib/buses';
import type { ThemeChangedEvent } from './types.js';

// Extend StateMap for theme selection
declare module '$lib/buses/StateBus/models/StateMap' {
  interface StateMap {
    'currentTheme': string | null;
  }
}

// Extend EventMap for theme events
declare module '$lib/buses/EventBus/types/EventMap' {
  interface AppEventMap {
    'theme:changed': {
      name: string | null;
      theme: any;
    };
  }
}

class ThemeSelector {
  async selectTheme(name: string): Promise<void> {
    try {
      // Load theme data from registry
      const theme = await themeRegistry.getTheme(name);
      
      // Update current theme in StateBus
      stateBus.set('currentTheme', name);
      
      // Publish theme change event
      const changeEvent: ThemeChangedEvent = {
        name,
        theme
      };
      eventBus.publish('theme:changed', changeEvent);
      
    } catch (error) {
      console.error(`Failed to select theme "${name}":`, error);
      throw error;
    }
  }

  getCurrentTheme(): string | null {
    return stateBus.get('currentTheme') ?? null;
  }

  async getAvailableThemes(): Promise<string[]> {
    return await themeRegistry.getThemes();
  }

  async hasTheme(name: string): Promise<boolean> {
    return await themeRegistry.hasTheme(name);
  }

  clearSelection(): void {
    const previousTheme = this.getCurrentTheme();
    stateBus.set('currentTheme', null);
    
    if (previousTheme) {
      eventBus.publish('theme:changed', { name: null, theme: null });
    }
  }
}

export const themeSelector = new ThemeSelector();