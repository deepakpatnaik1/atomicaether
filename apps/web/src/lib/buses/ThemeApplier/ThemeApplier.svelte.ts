import { eventBus } from '$lib/buses';
import type { CSSPropertyMap } from './types.js';

class ThemeApplier {
  private unsubscribe?: () => void;
  private isInitialized = false;

  // Map theme JSON properties to CSS custom properties
  private readonly propertyMap: CSSPropertyMap = {
    'appBackground': '--app-background',
    'textColor': '--text-color',
    'surfaceBackground': '--surface-background',
    'accent': '--accent-color',
    // Will grow organically as themes expand
  };

  initialize(): void {
    if (this.isInitialized) return;

    // Subscribe to theme change events
    this.unsubscribe = eventBus.subscribe('theme:changed', (event) => {
      console.log('ThemeApplier: Applying theme change:', event);
      
      if (event.theme) {
        this.applyTheme(event.theme);
      } else {
        this.clearTheme();
      }
    });

    this.isInitialized = true;
    console.log('ThemeApplier: Initialized and listening for theme changes');
  }

  applyTheme(theme: any): void {
    if (typeof document === 'undefined') return; // SSR safety

    const rootElement = document.documentElement;

    // Apply each theme property as a CSS custom property
    Object.entries(this.propertyMap).forEach(([themeKey, cssVar]) => {
      const value = theme[themeKey];
      if (value !== undefined) {
        rootElement.style.setProperty(cssVar, value);
        console.log(`ThemeApplier: Set ${cssVar} = ${value}`);
      }
    });
  }

  clearTheme(): void {
    if (typeof document === 'undefined') return; // SSR safety

    const rootElement = document.documentElement;

    // Remove all theme CSS custom properties
    Object.values(this.propertyMap).forEach((cssVar) => {
      rootElement.style.removeProperty(cssVar);
    });

    console.log('ThemeApplier: Cleared all theme properties');
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    this.clearTheme();
    this.isInitialized = false;
    console.log('ThemeApplier: Destroyed');
  }

  // Utility method to get current CSS property value
  getCurrentProperty(cssVar: string): string {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar);
  }
}

export const themeApplier = new ThemeApplier();