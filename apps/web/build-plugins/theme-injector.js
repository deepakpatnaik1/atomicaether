/**
 * Vite plugin to inject build-time theme CSS into app.html
 * Prevents FOUC by applying theme colors before any JavaScript loads
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

export function themeInjector() {
  return {
    name: 'theme-injector',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        console.log('🎨 Theme injector plugin called!');
        try {
          // Read the build-time theme - try multiple possible paths
          const possiblePaths = [
            resolve(process.cwd(), 'static/themes/rainy-night.json'),
            resolve(process.cwd(), 'apps/web/static/themes/rainy-night.json'),
            resolve(import.meta.dirname, '../static/themes/rainy-night.json')
          ];
          
          let themeData = null;
          let themePath = null;
          
          for (const path of possiblePaths) {
            try {
              console.log('🔍 Trying path:', path);
              themeData = JSON.parse(readFileSync(path, 'utf-8'));
              themePath = path;
              break;
            } catch (e) {
              console.log('❌ Path failed:', path);
            }
          }
          
          if (!themeData) {
            throw new Error('Could not find rainy-night.json theme file');
          }
          
          console.log('✅ Theme loaded from:', themePath);
          console.log('📝 Theme name:', themeData.name);
          
          // Generate CSS from theme data
          const themeCSS = `
            <style>
              /* Build-time theme injection - prevents FOUC */
              body {
                background: ${themeData.globalBody.background} !important;
                color: ${themeData.globalBody.color} !important;
                transition: ${themeData.globalBody.transition};
                margin: 0;
                padding: 0;
              }
              
              /* Theme-aware CSS custom properties */
              :root {
                --build-time-bg: ${themeData.globalBody.background};
                --build-time-text: ${themeData.globalBody.color};
                --build-time-link: ${themeData.navigation.link.color};
                --build-time-tagline: ${themeData.navigation.tagline.color};
              }
            </style>`;
          
          // Inject before %sveltekit.head%
          const result = html.replace('%sveltekit.head%', `${themeCSS}\n\t\t%sveltekit.head%`);
          console.log('💉 Theme CSS injected successfully!');
          return result;
          
        } catch (error) {
          console.warn('❌ Theme injection failed:', error.message);
          return html; // Fallback to original HTML if theme loading fails
        }
      }
    }
  };
}