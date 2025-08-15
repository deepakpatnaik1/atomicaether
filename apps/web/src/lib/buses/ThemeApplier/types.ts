export interface CSSPropertyMap {
  [themeProperty: string]: string; // Maps theme JSON keys to CSS variable names
}

export interface ThemeApplierConfig {
  propertyPrefix: string; // Prefix for CSS custom properties (e.g., '--theme-')
  transitionDuration?: string; // CSS transition duration for theme changes
}