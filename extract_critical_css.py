#!/usr/bin/env python3
"""
Extract critical CSS variables that are needed before first paint.
These are the variables used in visible, above-the-fold content.
"""

import json
import re

def extract_critical_variables():
    """Extract the most critical CSS variables needed to prevent FOUC."""
    
    # Read the theme file
    with open('apps/web/static/themes/rainy-night.json', 'r') as f:
        theme = json.load(f)
    
    # Define critical paths - these are needed immediately
    critical_paths = {
        # Global body styles
        'globalBody.background': '--app-background',
        'globalBody.color': '--app-color',
        
        # Input bar essentials (always visible)
        'inputBar.background.color': '--input-bar-background',
        'inputBar.background.backdropFilter': '--input-bar-backdrop',
        'inputBar.border.radius': '--input-bar-radius',
        'inputBar.border.width': '--input-bar-border-width',
        'inputBar.border.style': '--input-bar-border-style',
        'inputBar.border.gradientTop': '--input-bar-gradient-top',
        'inputBar.border.gradientBottom': '--input-bar-gradient-bottom',
        
        # Text input (critical for input bar)
        'textInput.typography.color': '--text-input-color',
        'textInput.typography.placeholderColor': '--text-input-placeholder',
        
        # Controls row (visible in input bar)
        'controlsRow.dropdownTrigger.color': '--dropdown-trigger-color',
        'controlsRow.dropdownTrigger.chevron.color': '--chevron-color',
        'controlsRow.plusButton.icon.color': '--plus-icon-color',
        'controlsRow.statusIndicator.color': '--status-indicator-color',
        
        # Essential spacing
        'spacing.micro': '--spacing-micro',
        'spacing.tiny': '--spacing-tiny', 
        'spacing.small': '--spacing-small',
        'spacing.compact': '--spacing-compact',
        'spacing.medium': '--spacing-medium',
        
        # Essential borders
        'borders.width.subtle': '--borders-width-subtle',
        'borders.radius.small': '--borders-radius-small',
        'borders.radius.medium': '--borders-radius-medium',
        
        # Typography essentials
        'typography.fontFamily.system': '--typography-font-family-system',
        'typography.fontSize.small': '--typography-font-size-small',
        'typography.fontSize.medium': '--typography-font-size-medium',
        
        # Effects
        'effects.opacity.muted': '--effects-opacity-muted',
        'effects.transitions.quick': '--effects-transitions-quick',
    }
    
    # Extract values
    critical_css = []
    for path, var_name in critical_paths.items():
        keys = path.split('.')
        value = theme
        try:
            for key in keys:
                value = value[key]
            if not key.startswith('_'):  # Skip metadata fields
                critical_css.append(f"    {var_name}: {value};")
        except (KeyError, TypeError):
            print(f"⚠️  Missing: {path}")
    
    # Generate CSS
    css_output = """  /* CRITICAL CSS - Prevents FOUC */
  /* Auto-generated from theme - do not edit manually */
  :root {
    /* Theme variables for immediate render */
""" + '\n'.join(critical_css) + """
    
    /* FOUC prevention */
    --app-initial-opacity: 0;
  }
  
  /* Prevent FOUC - hide until theme loads */
  html:not(.theme-ready) {
    opacity: 0;
  }
  
  html {
    transition: opacity 0.15s ease-out;
  }
  
  html.theme-ready {
    opacity: 1;
  }
  
  /* Immediate body styles */
  body {
    background: var(--app-background);
    color: var(--app-color);
    margin: 0;
    padding: 0;
    font-family: var(--typography-font-family-system);
  }"""
    
    return css_output

def generate_hooks_server():
    """Generate the hooks.server.ts file content."""
    
    return '''import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import fs from 'fs/promises';
import path from 'path';

// Cache themes in production
const themeCache = new Map<string, any>();

async function loadTheme(themeName: string) {
  if (themeCache.has(themeName)) {
    return themeCache.get(themeName);
  }
  
  try {
    const themePath = path.join(process.cwd(), 'static/themes', `${themeName}.json`);
    const themeData = await fs.readFile(themePath, 'utf-8');
    const parsed = JSON.parse(themeData);
    
    if (!building) {
      themeCache.set(themeName, parsed);
    }
    
    return parsed;
  } catch (error) {
    console.error(`Failed to load theme ${themeName}:`, error);
    return null;
  }
}

function flattenTheme(obj: any, prefix = '--', path: string[] = []): string[] {
  const result: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_')) continue; // Skip metadata
    
    const newPath = [...path, key];
    const cssVarName = prefix + newPath.join('-').replace(/([A-Z])/g, '-$1').toLowerCase();
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result.push(...flattenTheme(value, prefix, newPath));
    } else if (typeof value === 'string' || typeof value === 'number') {
      result.push(`${cssVarName}: ${value};`);
    }
  }
  
  return result;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Get theme from cookie or default
  const selectedTheme = event.cookies.get('selected-theme') || 'rainy-night';
  
  // Load theme data
  const themeData = await loadTheme(selectedTheme);
  
  // Generate CSS variables
  let themeCSS = '';
  if (themeData) {
    const cssVars = flattenTheme(themeData);
    themeCSS = `:root { ${cssVars.join(' ')} }`;
  }
  
  // Add theme class to html element
  const response = await resolve(event, {
    transformPageChunk: ({ html }) => {
      // Inject theme CSS
      html = html.replace(
        '</head>',
        `<style id="theme-variables">${themeCSS}</style>
        <script>
          // Mark theme as ready immediately
          document.documentElement.classList.add('theme-ready');
        </script>
        </head>`
      );
      
      // Add data-theme attribute
      html = html.replace(
        '<html',
        `<html data-theme="${selectedTheme}"`
      );
      
      return html;
    }
  });
  
  return response;
};'''

def generate_theme_store():
    """Generate a Svelte store for theme management."""
    
    return '''import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Theme state
export const currentTheme = writable<string>('rainy-night');
export const themeLoading = writable<boolean>(true);
export const themeError = writable<string | null>(null);

// Theme persistence
export function setTheme(theme: string) {
  currentTheme.set(theme);
  
  if (browser) {
    // Set cookie for SSR
    document.cookie = `selected-theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
    
    // Update data attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Reload theme (you'll need to implement this based on your theme loader)
    loadThemeVariables(theme);
  }
}

// Load theme variables dynamically
async function loadThemeVariables(themeName: string) {
  try {
    themeLoading.set(true);
    themeError.set(null);
    
    const response = await fetch(`/themes/${themeName}.json`);
    if (!response.ok) throw new Error(`Failed to load theme: ${themeName}`);
    
    const theme = await response.json();
    
    // Apply theme variables to root
    applyThemeVariables(theme);
    
    // Mark as ready
    document.documentElement.classList.add('theme-ready');
    
  } catch (error) {
    console.error('Theme loading error:', error);
    themeError.set(error.message);
  } finally {
    themeLoading.set(false);
  }
}

function applyThemeVariables(theme: any, prefix = '--', path: string[] = []) {
  const root = document.documentElement;
  
  for (const [key, value] of Object.entries(theme)) {
    if (key.startsWith('_')) continue;
    
    const newPath = [...path, key];
    const cssVarName = prefix + newPath.join('-').replace(/([A-Z])/g, '-$1').toLowerCase();
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      applyThemeVariables(value, prefix, newPath);
    } else if (typeof value === 'string' || typeof value === 'number') {
      root.style.setProperty(cssVarName, String(value));
    }
  }
}

// Initialize on mount
if (browser) {
  // Check for saved theme
  const savedTheme = document.cookie
    .split('; ')
    .find(row => row.startsWith('selected-theme='))
    ?.split('=')[1];
  
  if (savedTheme) {
    currentTheme.set(savedTheme);
  }
  
  // Theme is already loaded via SSR, just mark as ready
  document.documentElement.classList.add('theme-ready');
  themeLoading.set(false);
}'''

def main():
    print("🎨 Generating FOUC Prevention Files\n")
    print("=" * 50)
    
    # 1. Generate critical CSS
    print("\n📝 Generating critical CSS...")
    critical_css = extract_critical_variables()
    
    with open('critical-css-snippet.txt', 'w') as f:
        f.write(critical_css)
    print("✅ Saved to critical-css-snippet.txt")
    
    # 2. Generate hooks.server.ts
    print("\n📝 Generating hooks.server.ts...")
    hooks_content = generate_hooks_server()
    
    with open('hooks.server.ts.txt', 'w') as f:
        f.write(hooks_content)
    print("✅ Saved to hooks.server.ts.txt")
    
    # 3. Generate theme store
    print("\n📝 Generating theme store...")
    store_content = generate_theme_store()
    
    with open('theme-store.ts.txt', 'w') as f:
        f.write(store_content)
    print("✅ Saved to theme-store.ts.txt")
    
    print("\n" + "=" * 50)
    print("✨ FOUC prevention files generated!")
    print("\nNext steps:")
    print("1. Add critical CSS to app.html")
    print("2. Create src/hooks.server.ts")
    print("3. Create theme store at src/lib/stores/theme.ts")
    print("4. Update components to use theme store")

if __name__ == "__main__":
    main()