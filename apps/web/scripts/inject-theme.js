#!/usr/bin/env node
/**
 * Build script to inject theme CSS into app.html
 * Prevents FOUC by applying theme colors before any JavaScript loads
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  console.log('🎨 Injecting build-time theme into app.html...');
  
  // Read the theme file
  const themePath = resolve(__dirname, '../static/themes/rainy-night.json');
  const themeData = JSON.parse(readFileSync(themePath, 'utf-8'));
  console.log('✅ Theme loaded:', themeData.name);
  
  // Read app.html template
  const appHtmlPath = resolve(__dirname, '../src/app.html');
  let appHtml = readFileSync(appHtmlPath, 'utf-8');
  
  // Generate theme CSS
  const themeCSS = `\t\t<!-- Build-time theme injection - prevents FOUC -->
\t\t<style>
\t\t\tbody {
\t\t\t\tbackground: ${themeData.globalBody.background} !important;
\t\t\t\tcolor: ${themeData.globalBody.color} !important;
\t\t\t\tmargin: 0;
\t\t\t\tpadding: 0;
\t\t\t}
\t\t</style>`;
  
  // Check if theme CSS is already injected and remove it for re-injection
  if (appHtml.includes('Build-time theme injection')) {
    console.log('🔄 Updating existing theme injection in app.html');
    // Remove existing theme injection
    appHtml = appHtml.replace(/\t\t<!-- Build-time theme injection - prevents FOUC -->[\s\S]*?<\/style>\n/g, '');
  }
  
  // Inject before %sveltekit.head%
  const updatedHtml = appHtml.replace(
    /(\s*)%sveltekit\.head%/,
    `$1${themeCSS}\n$1%sveltekit.head%`
  );
  
  // Write updated app.html
  writeFileSync(appHtmlPath, updatedHtml, 'utf-8');
  console.log('💉 Theme CSS injected into app.html successfully!');
  console.log('🎯 FOUC prevention: Body background now applies before JS loads');
  
} catch (error) {
  console.error('❌ Theme injection failed:', error.message);
  process.exit(1);
}