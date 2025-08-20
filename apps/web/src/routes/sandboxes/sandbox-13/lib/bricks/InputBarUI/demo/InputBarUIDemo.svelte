<script lang="ts">
  import { onMount } from 'svelte';
  import { InputBarUI } from '../index.js';
  import { themeSelector, themeApplier, configBus } from '$lib/buses';
  import type { RainyNightTheme, DemoPageConfig } from '../core/types.js';
  
  let theme: RainyNightTheme | null = $state(null);
  let demoConfig: DemoPageConfig | null = $state(null);

  onMount(async () => {
    // Apply theme system for consistent styling
    themeApplier.initialize();
    themeSelector.selectTheme('rainy-night');
    
    // Load configs for externalization
    theme = await configBus.load('themes/rainy-night');
    demoConfig = await configBus.load('demoPage');
  });
</script>

<nav>
  <a href="{demoConfig?.navigation.backLink || '/brickdemos'}">{demoConfig?.navigation.backText || '← Back to Brick Demos'}</a>
  <div class="{demoConfig?.styling.taglineClass || 'tagline'}">{demoConfig?.content.title || 'BRICK-301 InputBarUI'} - {demoConfig?.content.description || 'Perfect Sandbox 11 recreation with config externalization'}</div>
</nav>

<!-- Global body styling to match theme -->
<svelte:head>
  {#if theme}
    <style>
      :root {
        --link-color: {theme.navigation.link.color};
        --tagline-color: {theme.navigation.tagline.color};
      }
      body {
        background: {theme.globalBody.background} !important;
        color: {theme.globalBody.color} !important;
        transition: {theme.globalBody.transition};
        margin: 0;
        padding: 0;
      }
    </style>
  {/if}
</svelte:head>

<InputBarUI />

<style>
  nav {
    margin-bottom: 20px;
    padding: 20px;
  }
  
  nav a {
    text-decoration: none;
    color: var(--link-color, #007acc);
  }

  :global(.tagline) {
    color: var(--tagline-color, rgba(223, 208, 184, 0.7));
    font-size: 14px;
    margin-top: 8px;
    font-style: italic;
  }
</style>