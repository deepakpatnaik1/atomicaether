<script lang="ts">
  import { onMount } from 'svelte';
  import { themeRegistry, themeSelector, eventBus } from '$lib/buses';
  
  let themes: string[] = [];
  let selectedTheme: any = null;
  let currentSelection: string | null = null;
  let loading = false;
  let error: string | null = null;

  onMount(async () => {
    try {
      loading = true;
      console.log('BRICK-602 ThemeSelector Demo - Loading...');
      
      // Get available themes
      themes = await themeSelector.getAvailableThemes();
      console.log('Available themes:', themes);
      
      // Get current selection
      currentSelection = themeSelector.getCurrentTheme();
      console.log('Current selection:', currentSelection);
      
      // Subscribe to theme changes
      const unsubscribe = eventBus.subscribe('theme:changed', (event) => {
        console.log('Theme changed event:', event);
        selectedTheme = event.theme;
        currentSelection = event.name;
      });
      
      // Load initial theme if any
      if (currentSelection) {
        selectedTheme = await themeRegistry.getTheme(currentSelection);
      }
      
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error('ThemeSelector error:', err);
    } finally {
      loading = false;
    }
  });

  async function selectTheme(themeName: string) {
    try {
      await themeSelector.selectTheme(themeName);
      console.log('Selected theme:', themeName);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function clearSelection() {
    themeSelector.clearSelection();
    console.log('Selection cleared');
  }
</script>

<nav>
  <a href="/demo">← Back to Demo Gallery</a>
</nav>

<h1>BRICK-602 ThemeSelector Demo</h1>

{#if loading}
  <p>Loading...</p>
{:else if error}
  <p style="color: red;">Error: {error}</p>
{:else}
  <div>
    <h2>Available Themes ({themes.length})</h2>
    <ul>
      {#each themes as theme}
        <li>
          <button 
            on:click={() => selectTheme(theme)}
            disabled={currentSelection === theme}
          >
            {theme} {currentSelection === theme ? '(selected)' : ''}
          </button>
        </li>
      {/each}
    </ul>

    <button on:click={clearSelection}>Clear Selection</button>
    
    <h2>Current Selection: {currentSelection ?? 'None'}</h2>

    {#if selectedTheme}
      <h2>Selected Theme: {selectedTheme.name}</h2>
      <div style="background: {selectedTheme.appBackground}; padding: 20px; color: white;">
        <p>Theme Background: {selectedTheme.appBackground}</p>
        <pre>{JSON.stringify(selectedTheme, null, 2)}</pre>
      </div>
    {/if}
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
  
  button {
    margin: 5px;
    padding: 10px;
    cursor: pointer;
  }
  
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  pre {
    background: rgba(255,255,255,0.1);
    padding: 10px;
    border-radius: 4px;
  }
</style>