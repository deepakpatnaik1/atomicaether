<script lang="ts">
  import { onMount } from 'svelte';
  import { InputBarUI } from '../index.js';
  import { themeSelector, themeApplier } from '$lib/buses';

  onMount(() => {
    // Apply theme system for consistent styling
    themeApplier.initialize();
    themeSelector.selectTheme('rainy-night');
  });
</script>

<nav>
  <a href="/brickdemos">← Back to Brick Demos</a>
  <div class="tagline">BRICK-301 InputBarUI - Perfect Sandbox 11 recreation with config externalization</div>
</nav>

<!-- Global body styling to match theme -->
<svelte:head>
  <style>
    body {
      background: #222831 !important;
      color: #e0e0e0 !important;
      transition: all 0.3s ease;
      margin: 0;
      padding: 0;
    }
  </style>
</svelte:head>

<InputBarUI />

<style>
  nav {
    margin-bottom: 20px;
    padding: 20px;
  }
  
  nav a {
    text-decoration: none;
    color: #007acc;
  }

  .tagline {
    color: rgba(223, 208, 184, 0.7);
    font-size: 14px;
    margin-top: 8px;
    font-style: italic;
  }
</style>