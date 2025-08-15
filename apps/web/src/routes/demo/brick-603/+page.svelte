<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { themeRegistry, themeSelector, themeApplier } from '$lib/buses';
  
  let themes: string[] = [];
  let selectedTheme: any = null;
  let currentSelection: string | null = null;
  let loading = false;
  let error: string | null = null;
  let cssProperties: { [key: string]: string } = {};

  onMount(async () => {
    try {
      loading = true;
      console.log('BRICK-603 ThemeApplier Demo - Loading...');
      
      // Initialize ThemeApplier to start listening for theme changes
      themeApplier.initialize();
      
      // Get available themes
      themes = await themeSelector.getAvailableThemes();
      console.log('Available themes:', themes);
      
      // Get current selection
      currentSelection = themeSelector.getCurrentTheme();
      console.log('Current selection:', currentSelection);
      
      // Load initial theme if any
      if (currentSelection) {
        selectedTheme = await themeRegistry.getTheme(currentSelection);
        updateCSSProperties();
      }
      
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error('ThemeApplier error:', err);
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    // Clean up when component is destroyed
    themeApplier.destroy();
  });

  async function selectTheme(themeName: string) {
    try {
      await themeSelector.selectTheme(themeName);
      selectedTheme = await themeRegistry.getTheme(themeName);
      currentSelection = themeName;
      
      // Update CSS properties display after a brief delay to let ThemeApplier work
      setTimeout(updateCSSProperties, 100);
      
      console.log('Selected theme:', themeName);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function clearSelection() {
    themeSelector.clearSelection();
    selectedTheme = null;
    currentSelection = null;
    setTimeout(updateCSSProperties, 100);
    console.log('Selection cleared');
  }

  function updateCSSProperties() {
    // Show current CSS custom properties applied by ThemeApplier
    cssProperties = {
      '--app-background': themeApplier.getCurrentProperty('--app-background'),
      '--text-color': themeApplier.getCurrentProperty('--text-color'),
      '--surface-background': themeApplier.getCurrentProperty('--surface-background'),
      '--accent-color': themeApplier.getCurrentProperty('--accent-color'),
    };
  }
</script>

<nav>
  <a href="/demo">← Back to Demo Gallery</a>
</nav>

<h1>BRICK-603 ThemeApplier Demo</h1>

<p>This demo shows how ThemeApplier automatically converts theme JSON into CSS custom properties that affect the entire page.</p>

{#if loading}
  <p>Loading...</p>
{:else if error}
  <p style="color: red;">Error: {error}</p>
{:else}
  <div>
    <h2>Theme Selection</h2>
    <div class="theme-buttons">
      {#each themes as theme}
        <button 
          on:click={() => selectTheme(theme)}
          disabled={currentSelection === theme}
        >
          {theme} {currentSelection === theme ? '(selected)' : ''}
        </button>
      {/each}
      <button on:click={clearSelection}>Clear Selection</button>
    </div>
    
    <h2>Current Selection: {currentSelection ?? 'None'}</h2>

    {#if selectedTheme}
      <h2>Theme Data</h2>
      <div class="theme-display" style="background: var(--app-background, #f0f0f0); color: var(--text-color, #333);">
        <p>This box uses CSS custom properties applied by ThemeApplier!</p>
        <p>Background: var(--app-background)</p>
        <p>Text: var(--text-color)</p>
        <pre>{JSON.stringify(selectedTheme, null, 2)}</pre>
      </div>
    {/if}

    <h2>Applied CSS Custom Properties</h2>
    <div class="css-properties">
      {#each Object.entries(cssProperties) as [property, value]}
        <div class="property-row">
          <span class="property-name">{property}:</span>
          <span class="property-value">{value || '(not set)'}</span>
        </div>
      {/each}
    </div>

    <p><strong>Try this:</strong> Open browser DevTools, inspect the <code>&lt;html&gt;</code> element, and see the CSS custom properties applied to the root!</p>
  </div>
{/if}

<style>
  nav {
    margin-bottom: 20px;
  }
  
  nav a {
    text-decoration: none;
    color: #007acc;
  }
  
  .theme-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  
  button {
    padding: 10px 15px;
    cursor: pointer;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
  }
  
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .theme-display {
    padding: 20px;
    border-radius: 8px;
    margin: 15px 0;
    border: 2px solid var(--accent-color, #ddd);
  }
  
  .css-properties {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 4px;
    font-family: monospace;
  }
  
  .property-row {
    display: flex;
    margin-bottom: 5px;
  }
  
  .property-name {
    font-weight: bold;
    min-width: 200px;
  }
  
  .property-value {
    color: #666;
  }
  
  pre {
    background: rgba(255,255,255,0.1);
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }

  code {
    background: #e0e0e0;
    padding: 2px 4px;
    border-radius: 2px;
  }
</style>