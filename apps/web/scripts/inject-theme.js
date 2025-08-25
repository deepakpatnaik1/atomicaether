#!/usr/bin/env node
/**
 * Build script to inject theme CSS variables into app.html
 * This runs at build time to provide immediate theme application
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  console.log('🎨 Injecting theme variables into app.html...');
  
  // Read the theme file
  const themePath = resolve(__dirname, '../static/themes/rainy-night.json');
  const themeData = JSON.parse(readFileSync(themePath, 'utf-8'));
  console.log('✅ Theme loaded:', themeData.name);
  
  // Read app.html template
  const appHtmlPath = resolve(__dirname, '../src/app.html');
  let appHtml = readFileSync(appHtmlPath, 'utf-8');
  
  // Generate only essential CSS variables for critical rendering
  const criticalVars = `
		<!-- Theme variables injected at build time -->
		<style id="theme-vars">
			:root {
				/* Critical theme variables */
				--app-background: ${themeData.globalBody.background};
				--app-color: ${themeData.globalBody.color};
				--text-color: ${themeData.globalBody.color};
				--spacing-reset: 0;
				--spacing-standard: 16px;
				--app-container-height: 100vh;
				--global-body-transition: none;
				--typography-font-family-system: system-ui, -apple-system, sans-serif;
			}
		</style>`;
  
  // Replace the injection point with theme variables
  const updatedHtml = appHtml.replace(
    '<!-- THEME_INJECTION_POINT -->',
    criticalVars
  );
  
  // Write updated app.html
  writeFileSync(appHtmlPath, updatedHtml, 'utf-8');
  console.log('💉 Theme variables injected successfully!');
  console.log('🎯 Critical CSS and theme vars ready for immediate render');
  
} catch (error) {
  console.error('❌ Theme injection failed:', error.message);
  process.exit(1);
}