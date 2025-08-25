import type { Handle } from '@sveltejs/kit';
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
};