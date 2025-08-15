<script lang="ts">
  import { onMount } from 'svelte';
  import { themeSelector, themeApplier } from '$lib/buses';
  
  onMount(() => {
    // Apply rainy night theme
    themeApplier.initialize();
    themeSelector.selectTheme('rainy-night');
  });
</script>

<nav>
  <a href="/demo">← Back to Demo Gallery</a>
</nav>

<style>
  :global(body) {
    background: var(--app-background, #222831) !important;
    color: var(--text-color, #e0e0e0) !important;
    transition: all 0.3s ease;
  }
  
  nav {
    margin-bottom: 20px;
  }
  
  nav a {
    text-decoration: none;
    color: #007acc;
  }
</style>