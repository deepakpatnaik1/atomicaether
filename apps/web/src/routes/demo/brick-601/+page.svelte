<script lang="ts">
  import { onMount } from 'svelte';
  import { themeRegistry } from '$lib/buses';
  
  let themes: string[] = [];
  let selectedTheme: any = null;
  let loading = false;
  let error: string | null = null;

  onMount(async () => {
    try {
      loading = true;
      console.log('BRICK-601 ThemeRegistry Demo - Loading themes...');
      
      themes = await themeRegistry.getThemes();
      console.log('Available themes:', themes);
      
      if (themes.length > 0) {
        selectedTheme = await themeRegistry.getTheme(themes[0]);
        console.log('Loaded theme:', selectedTheme);
      }
      
      const hasRainyNight = await themeRegistry.hasTheme('rainy-night');
      console.log('Has rainy-night theme:', hasRainyNight);
      
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error('ThemeRegistry error:', err);
    } finally {
      loading = false;
    }
  });

  async function loadTheme(themeName: string) {
    try {
      selectedTheme = await themeRegistry.getTheme(themeName);
      console.log('Loaded theme:', selectedTheme);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<nav>
  <a href="/demo">← Back to Demo Gallery</a>
</nav>

<h1>BRICK-601 ThemeRegistry Demo</h1>

{#if loading}
  <p>Loading themes...</p>
{:else if error}
  <p style="color: red;">Error: {error}</p>
{:else}
  <div>
    <h2>Available Themes ({themes.length})</h2>
    <ul>
      {#each themes as theme}
        <li>
          <button on:click={() => loadTheme(theme)}>
            {theme}
          </button>
        </li>
      {/each}
    </ul>

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
  
  pre {
    background: rgba(255,255,255,0.1);
    padding: 10px;
    border-radius: 4px;
  }
</style>