import { eventBus } from '$lib/buses';

class ThemeApplier {
  private unsubscribe?: () => void;
  private isInitialized = false;

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

  /**
   * Recursively flatten theme object and apply as CSS variables
   */
  applyTheme(theme: any): void {
    if (typeof document === 'undefined') return; // SSR safety

    const rootElement = document.documentElement;
    const cssVariables = this.flattenThemeObject(theme);
    
    // Apply each CSS variable
    Object.entries(cssVariables).forEach(([cssVar, value]) => {
      rootElement.style.setProperty(cssVar, value);
    });
    
    // Mark theme as ready after applying variables
    requestAnimationFrame(() => {
      document.documentElement.classList.add('theme-ready');
    });
    
    console.log(`ThemeApplier: Applied ${Object.keys(cssVariables).length} CSS variables`);
  }

  /**
   * Flatten nested theme object into CSS variables
   * e.g., { spacing: { micro: "4px" } } → { "--spacing-micro": "4px" }
   */
  private flattenThemeObject(obj: any, prefix = '--', path: string[] = []): Record<string, string> {
    const result: Record<string, string> = {};

    Object.entries(obj).forEach(([key, value]) => {
      // Skip private keys (comments and notes)
      if (key.startsWith('_')) return;
      
      // Build the CSS variable name
      const newPath = [...path, this.kebabCase(key)];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(result, this.flattenThemeObject(value, prefix, newPath));
      } else if (typeof value === 'string' || typeof value === 'number') {
        // Create CSS variable
        const cssVarName = prefix + newPath.join('-');
        result[cssVarName] = String(value);
      }
    });

    // Add special mappings for backward compatibility
    if (path.length === 0) {
      // Map globalBody to root-level variables for existing code
      if (obj.globalBody) {
        result['--app-background'] = obj.globalBody.background || '#222831';
        result['--text-color'] = obj.globalBody.color || '#e0e0e0';
      }
    }

    return result;
  }

  /**
   * Convert camelCase to kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([A-Z])/g, (match, letter, index) => {
      return index > 0 ? `-${letter.toLowerCase()}` : letter.toLowerCase();
    });
  }

  clearTheme(): void {
    if (typeof document === 'undefined') return; // SSR safety

    const rootElement = document.documentElement;
    const styles = rootElement.style;
    
    // Remove all CSS variables that start with --
    for (let i = styles.length - 1; i >= 0; i--) {
      const prop = styles[i];
      if (prop && prop.startsWith('--')) {
        rootElement.style.removeProperty(prop);
      }
    }

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