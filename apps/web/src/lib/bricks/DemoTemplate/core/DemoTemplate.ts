import type { TemplateOptions, TemplateConfig } from '../models/TemplateOptions';

export class DemoTemplate {
  public config: TemplateConfig | null = null;

  async init(): Promise<void> {
    try {
      // For now, load config directly until ConfigBus is available
      const response = await fetch('/config/demoTemplate.json');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }
      this.config = await response.json();
    } catch (error) {
      console.error('[DemoTemplate] Failed to initialize:', error);
      throw error;
    }
  }

  generateDemoComponent(options: TemplateOptions): string {
    if (!this.config) {
      throw new Error('DemoTemplate not initialized');
    }

    const { name, series, category, description, tags, status } = {
      series: this.config.defaultMetadata.series,
      category: this.config.defaultMetadata.category,
      description: this.config.defaultMetadata.description.replace('{name}', options.name),
      tags: this.config.defaultMetadata.tags,
      status: this.config.defaultMetadata.status as 'stable' | 'wip' | 'broken',
      ...options
    };

    const className = this.toPascalCase(name);
    const sections = this.config.templateSections;

    return `<!-- demo-meta:
{
  "name": "${name}",
  "series": "${series}",
  "category": "${category}",
  "description": "${description}",
  "tags": ${JSON.stringify(tags)},
  "status": "${status}"
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
      // Initialize the feature
      initialized = true;
    } catch (e) {
      error = \`Failed to initialize: \${e}\`;
    }
  });
  
  ${sections.actions ? this.generateActionsSection(name) : ''}
  
  ${sections.reset ? this.generateResetSection() : ''}
  
  // State display
  $: stateDisplay = {
    initialized,
    loading,
    error: error || null,
    result
  };
</script>

<div class="${this.config.styling.containerClass}">
  <h1>${this.toTitleCase(name)} Demo</h1>
  
  ${sections.actions ? this.generateActionsHTML() : ''}
  
  ${sections.state ? this.generateStateHTML() : ''}
  
  ${sections.output ? this.generateOutputHTML() : ''}
  
  ${sections.debug ? this.generateDebugHTML(name) : ''}
  
  ${sections.reset ? this.generateResetHTML() : ''}
</div>

<style>
  .${this.config.styling.containerClass} {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .${this.config.styling.sectionClass} {
    background: #f9fafb;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .${this.config.styling.sectionClass} h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1f2937;
  }
  
  .${this.config.styling.buttonClass} {
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
  
  .${this.config.styling.buttonClass}:hover {
    background: #4f46e5;
  }
  
  .${this.config.styling.buttonClass}:disabled {
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

  private generateActionsSection(name: string): string {
    return `
  // Actions
  async function testMethod1() {
    loading = true;
    error = '';
    try {
      // TODO: Implement test for method 1
      result = { test: 'Method 1 result' };
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
      result = { test: 'Method 2 result' };
    } catch (e) {
      error = \`Method 2 failed: \${e}\`;
    } finally {
      loading = false;
    }
  }`;
  }

  private generateResetSection(): string {
    return `
  function reset() {
    loading = false;
    error = '';
    result = null;
    console.log('[Demo] Reset to initial state');
  }`;
  }

  private generateActionsHTML(): string {
    return `
  <!-- Actions Section -->
  <section class="${this.config!.styling.sectionClass}">
    <h2>Actions</h2>
    <div>
      <button 
        class="${this.config!.styling.buttonClass}"
        on:click={testMethod1}
        disabled={loading}
      >
        Test Method 1
      </button>
      <button 
        class="${this.config!.styling.buttonClass}"
        on:click={testMethod2}
        disabled={loading}
      >
        Test Method 2
      </button>
    </div>
  </section>`;
  }

  private generateStateHTML(): string {
    return `
  <!-- State Section -->
  <section class="${this.config!.styling.sectionClass}">
    <h2>Current State</h2>
    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
      <span class="status-indicator {initialized ? 'active' : 'inactive'}"></span>
      <span>Initialized: {initialized}</span>
    </div>
    <pre>{JSON.stringify(stateDisplay, null, 2)}</pre>
  </section>`;
  }

  private generateOutputHTML(): string {
    return `
  <!-- Output Section -->
  <section class="${this.config!.styling.sectionClass}">
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
  </section>`;
  }

  private generateDebugHTML(name: string): string {
    return `
  <!-- Debug Section -->
  <section class="${this.config!.styling.sectionClass}">
    <h2>Debug Info</h2>
    <p>📝 Check browser console for detailed logs</p>
    <p>🔍 Feature available at <code>window.__${this.toCamelCase(name)}</code> (DEV mode)</p>
    <p>📊 State updates are reactive via Svelte</p>
  </section>`;
  }

  private generateResetHTML(): string {
    return `
  <!-- Reset Section -->
  <section class="${this.config!.styling.sectionClass}">
    <button 
      class="${this.config!.styling.buttonClass}"
      on:click={reset}
      style="background: #ef4444;"
    >
      Reset Demo
    </button>
  </section>`;
  }

  private toPascalCase(str: string): string {
    return str.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toTitleCase(str: string): string {
    return str.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getOutputPath(name: string): string {
    if (!this.config) {
      throw new Error('DemoTemplate not initialized');
    }
    return this.config.outputPath.replace('{name}', name);
  }
}