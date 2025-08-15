<script lang="ts">
  import { onMount } from 'svelte';
  import { themeSelector, themeApplier } from '$lib/buses';
  
  onMount(() => {
    // Apply rainy night theme
    themeApplier.initialize();
    themeSelector.selectTheme('rainy-night');
  });
</script>

<h1>🧪 AtomicAether Playground</h1>

<p>Free-thinking canvas for experiments without Essential Boss Rules constraints.</p>

<div class="gallery">
  <div class="brick-card">
    <h2>Sandbox 1</h2>
    <p>Clean experimental space for rapid prototyping</p>
    <a href="/play/canvas-1" class="demo-link">Experiment →</a>
  </div>

</div>


<style>
  :global(body) {
    background: var(--app-background, #222831) !important;
    color: var(--text-color, #e0e0e0) !important;
    transition: all 0.3s ease;
  }
  
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin: 20px 0;
  }
  
  .brick-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    background: #f9f9f9;
  }
  
  .brick-card h2 {
    margin: 0 0 10px 0;
    color: #333;
  }
  
  .brick-card p {
    color: #666;
    margin-bottom: 15px;
  }
  
  .demo-link {
    display: inline-block;
    background: #007acc;
    color: white;
    padding: 10px 15px;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
  }
  
  .demo-link:hover {
    background: #005a9f;
  }
  
  nav {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }
  
  nav a {
    text-decoration: none;
    color: #007acc;
    margin-right: 20px;
  }
</style>