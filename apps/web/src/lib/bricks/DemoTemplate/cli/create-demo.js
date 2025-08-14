#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toPascalCase(str) {
  return str.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toTitleCase(str) {
  return str.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateDemoComponent(name, config) {
  const className = toPascalCase(name);
  const sections = config.templateSections;
  const styling = config.styling;

  return `<!-- demo-meta:
{
  "name": "${name}",
  "series": "${config.defaultMetadata.series}",
  "category": "${config.defaultMetadata.category}",
  "description": "${config.defaultMetadata.description.replace('{name}', name)}",
  "tags": ${JSON.stringify(config.defaultMetadata.tags)},
  "status": "${config.defaultMetadata.status}"
}
-->

<script lang="ts">
  import { onMount } from 'svelte';
  
  // Feature states
  let loading = false;
  let error = '';
  let result: any = null;
  let initialized = false;
  
  onMount(async () => {
    try {
      // TODO: Initialize the feature here
      initialized = true;
      console.log('[Demo] ${toTitleCase(name)} initialized');
    } catch (e) {
      error = \`Failed to initialize: \${e}\`;
    }
  });
  
  // Actions
  async function testMethod1() {
    loading = true;
    error = '';
    try {
      // TODO: Implement test for method 1
      result = { test: 'Method 1 result', timestamp: Date.now() };
      console.log('[Demo] Method 1 executed', result);
    } catch (e) {
      error = \`Method 1 failed: \${e}\`;
    } finally {
      loading = false;
    }
  }
  
  async function testMethod2() {
    loading = true;
    error = '';
    try {
      // TODO: Implement test for method 2
      result = { test: 'Method 2 result', timestamp: Date.now() };
      console.log('[Demo] Method 2 executed', result);
    } catch (e) {
      error = \`Method 2 failed: \${e}\`;
    } finally {
      loading = false;
    }
  }
  
  function reset() {
    loading = false;
    error = '';
    result = null;
    console.log('[Demo] Reset to initial state');
  }
  
  // State display
  $: stateDisplay = {
    initialized,
    loading,
    error: error || null,
    result
  };
</script>

<div class="${styling.containerClass}">
  <h1>${toTitleCase(name)} Demo</h1>
  
  <!-- Actions Section -->
  <section class="${styling.sectionClass}">
    <h2>Actions</h2>
    <div>
      <button 
        class="${styling.buttonClass}"
        on:click={testMethod1}
        disabled={loading}
      >
        Test Method 1
      </button>
      <button 
        class="${styling.buttonClass}"
        on:click={testMethod2}
        disabled={loading}
      >
        Test Method 2
      </button>
    </div>
  </section>
  
  <!-- State Section -->
  <section class="${styling.sectionClass}">
    <h2>Current State</h2>
    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
      <span class="status-indicator {initialized ? 'active' : 'inactive'}"></span>
      <span>Initialized: {initialized}</span>
    </div>
    <pre>{JSON.stringify(stateDisplay, null, 2)}</pre>
  </section>
  
  <!-- Output Section -->
  <section class="${styling.sectionClass}">
    <h2>Output</h2>
    {#if loading}
      <p>Loading...</p>
    {/if}
    {#if error}
      <div class="error">{error}</div>
    {/if}
    {#if result}
      <pre>{JSON.stringify(result, null, 2)}</pre>
    {/if}
    {#if !loading && !error && !result}
      <p style="color: #6b7280;">No output yet. Try clicking an action button above.</p>
    {/if}
  </section>
  
  <!-- Debug Section -->
  <section class="${styling.sectionClass}">
    <h2>Debug Info</h2>
    <p>📝 Check browser console for detailed logs</p>
    <p>🔍 Feature available at <code>window.__${toCamelCase(name)}</code> (DEV mode)</p>
    <p>📊 State updates are reactive via Svelte</p>
  </section>
  
  <!-- Reset Section -->
  <section class="${styling.sectionClass}">
    <button 
      class="${styling.buttonClass}"
      on:click={reset}
      style="background: #ef4444;"
    >
      Reset Demo
    </button>
  </section>
</div>

<style>
  .${styling.containerClass} {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .${styling.sectionClass} {
    background: #f9fafb;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .${styling.sectionClass} h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1f2937;
  }
  
  .${styling.buttonClass} {
    padding: 0.5rem 1rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .${styling.buttonClass}:hover {
    background: #4f46e5;
  }
  
  .${styling.buttonClass}:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .error {
    color: #ef4444;
    padding: 1rem;
    background: #fee2e2;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  
  pre {
    background: #1f2937;
    color: #f3f4f6;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.5;
  }
  
  .status-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 0.5rem;
  }
  
  .status-indicator.active {
    background: #10b981;
  }
  
  .status-indicator.inactive {
    background: #ef4444;
  }
</style>`;
}

async function createDemo(name) {
  if (!name) {
    console.error('❌ Please provide a demo name');
    console.log('Usage: npm run create-demo <name>');
    process.exit(1);
  }

  // Normalize name (lowercase, hyphenated)
  const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
  
  try {
    // Load config
    const configPath = path.join(process.cwd(), '../../aetherVault/config/demoTemplate.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    // Generate component content
    const componentContent = generateDemoComponent(normalizedName, config);
    
    // Determine output path
    const outputPath = path.join(
      process.cwd(),
      config.outputPath.replace('{name}', normalizedName)
    );
    
    // Create directory if it doesn't exist
    await fs.mkdir(outputPath, { recursive: true });
    
    // Write the demo file
    const filePath = path.join(outputPath, '+page.svelte');
    await fs.writeFile(filePath, componentContent);
    
    console.log(`✅ Demo created successfully!`);
    console.log(`📁 Location: ${filePath}`);
    console.log(`🚀 Run 'npm run dev' and navigate to /demo/${normalizedName}`);
    console.log(`📝 Don't forget to implement the actual test methods!`);
    
  } catch (error) {
    console.error('❌ Failed to create demo:', error.message);
    process.exit(1);
  }
}

// Get name from command line arguments
const name = process.argv[2];
createDemo(name);