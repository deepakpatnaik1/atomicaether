<!-- demo-meta:
{
  "name": "demo-template",
  "series": "700s",
  "category": "Demo System",
  "description": "Demo template generator - creates consistent demo boilerplate",
  "tags": ["demo", "template", "generator", "cli"],
  "status": "stable"
}
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { DemoTemplate } from '$lib/bricks/DemoTemplate';
  
  let template: DemoTemplate;
  let loading = false;
  let error = '';
  let generatedCode = '';
  let demoName = 'example-feature';
  let series = '000s';
  let category = 'Example';
  let initialized = false;
  
  onMount(async () => {
    try {
      template = new DemoTemplate();
      await template.init();
      initialized = true;
      
      // Make available for debugging
      if (import.meta.env.DEV) {
        (window as any).__demoTemplate = template;
      }
    } catch (e) {
      error = `Failed to initialize DemoTemplate: ${e}`;
    }
  });
  
  async function generateDemo() {
    if (!template) {
      error = 'Template not initialized';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      generatedCode = template.generateDemoComponent({
        name: demoName,
        series,
        category,
        description: `Interactive demo for ${demoName}`,
        tags: ['demo', 'generated'],
        status: 'wip'
      });
      
      console.log('[DemoTemplate] Generated demo code:', generatedCode.length, 'characters');
    } catch (e) {
      error = `Failed to generate demo: ${e}`;
    } finally {
      loading = false;
    }
  }
  
  function showCLIUsage() {
    generatedCode = `# CLI Usage

# From the web app directory:
cd apps/web

# Create a new demo:
npm run create-demo my-feature

# This will create:
# src/routes/demo/my-feature/+page.svelte

# The demo will include:
# - Actions section with test methods
# - State display section
# - Output section for results
# - Debug section with console info
# - Reset button to clear state

# After creation:
# 1. Run npm run dev
# 2. Navigate to /demo/my-feature
# 3. Implement your test methods
# 4. Test your feature in isolation!`;
  }
  
  function reset() {
    demoName = 'example-feature';
    series = '000s';
    category = 'Example';
    generatedCode = '';
    error = '';
  }
  
  $: outputPath = template?.getOutputPath(demoName) || 'Not initialized';
</script>

<div class="demo-container">
  <h1>🎨 DemoTemplate Generator</h1>
  
  <!-- Configuration Section -->
  <section class="demo-section">
    <h2>Configuration</h2>
    <div class="input-group">
      <label>
        Demo Name:
        <input 
          type="text" 
          bind:value={demoName}
          placeholder="my-feature"
          disabled={loading}
        />
      </label>
      
      <label>
        Series:
        <select bind:value={series} disabled={loading}>
          <option value="000s">000s - Uncategorized</option>
          <option value="100s">100s - Buses</option>
          <option value="200s">200s - LLM</option>
          <option value="300s">300s - Input</option>
          <option value="400s">400s - Personas</option>
          <option value="500s">500s - Conversations</option>
          <option value="600s">600s - Theme</option>
          <option value="700s">700s - Demo System</option>
        </select>
      </label>
      
      <label>
        Category:
        <input 
          type="text" 
          bind:value={category}
          placeholder="Category"
          disabled={loading}
        />
      </label>
    </div>
    
    <p class="output-path">
      📁 Will be created at: <code>{outputPath}</code>
    </p>
  </section>
  
  <!-- Actions Section -->
  <section class="demo-section">
    <h2>Actions</h2>
    <button 
      class="demo-button"
      on:click={generateDemo}
      disabled={!initialized || loading}
    >
      Generate Demo Code
    </button>
    
    <button 
      class="demo-button"
      on:click={showCLIUsage}
      disabled={loading}
    >
      Show CLI Usage
    </button>
    
    <button 
      class="demo-button reset"
      on:click={reset}
    >
      Reset
    </button>
  </section>
  
  <!-- Status Section -->
  <section class="demo-section">
    <h2>Status</h2>
    <div class="status">
      <span class="status-indicator {initialized ? 'active' : 'inactive'}"></span>
      <span>Template Engine: {initialized ? 'Ready' : 'Not initialized'}</span>
    </div>
    {#if error}
      <div class="error">{error}</div>
    {/if}
  </section>
  
  <!-- Output Section -->
  <section class="demo-section">
    <h2>Generated Code</h2>
    {#if loading}
      <p>Generating demo template...</p>
    {:else if generatedCode}
      <pre>{generatedCode}</pre>
      <p class="hint">💡 Copy this code to create your demo manually, or use the CLI for easier creation!</p>
    {:else}
      <p style="color: #6b7280;">Click "Generate Demo Code" to see the template output</p>
    {/if}
  </section>
  
  <!-- Debug Section -->
  <section class="demo-section">
    <h2>Debug Info</h2>
    <p>📝 Template available at <code>window.__demoTemplate</code> (DEV mode)</p>
    <p>🔧 Config loaded from <code>aetherVault/config/demoTemplate.json</code></p>
    <p>🚀 This demo proves the template generator works!</p>
  </section>
</div>

<style>
  .demo-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .demo-section {
    background: #f9fafb;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .demo-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1f2937;
  }
  
  .input-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    color: #4b5563;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  input, select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  .output-path {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #eff6ff;
    border-radius: 6px;
    font-size: 0.875rem;
  }
  
  .output-path code {
    background: #dbeafe;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: monospace;
  }
  
  .demo-button {
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
  
  .demo-button:hover {
    background: #4f46e5;
  }
  
  .demo-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .demo-button.reset {
    background: #ef4444;
  }
  
  .demo-button.reset:hover {
    background: #dc2626;
  }
  
  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .status-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  
  .status-indicator.active {
    background: #10b981;
  }
  
  .status-indicator.inactive {
    background: #ef4444;
  }
  
  .error {
    color: #ef4444;
    padding: 1rem;
    background: #fee2e2;
    border-radius: 6px;
    margin-top: 1rem;
  }
  
  pre {
    background: #1f2937;
    color: #f3f4f6;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.5;
    max-height: 600px;
  }
  
  .hint {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #f0f9ff;
    border-left: 4px solid #0ea5e9;
    border-radius: 4px;
    font-size: 0.875rem;
  }
</style>