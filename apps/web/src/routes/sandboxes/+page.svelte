<script lang="ts">
  import { onMount } from 'svelte';
  import { themeSelector, themeApplier } from '$lib/buses';
  
  onMount(() => {
    // Apply rainy night theme
    themeApplier.initialize();
    themeSelector.selectTheme('rainy-night');
  });
</script>

<h1>🧪 AtomicAether Sandboxes</h1>

<p>Free-thinking canvas for experiments without Essential Boss Rules constraints.</p>

<div class="gallery">
  <div class="brick-card">
    <h2>Sandbox 1</h2>
    <p>Beautiful glassmorphic input bar from original AtomicAether</p>
    <a href="/sandboxes/sandbox-1" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 2</h2>
    <p>3 sides equal padding</p>
    <a href="/sandboxes/sandbox-2" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 3</h2>
    <p>Inspiration for different beautiful app themes</p>
    <a href="/sandboxes/sandbox-3" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 4</h2>
    <p>Horizontal stencil lines with convergence gradient</p>
    <a href="/sandboxes/sandbox-4" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 5</h2>
    <p>Near-final input bar look</p>
    <a href="/sandboxes/sandbox-5" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 6</h2>
    <p>Using + and drag 'n drop to add files to input bar</p>
    <a href="/sandboxes/sandbox-6" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 7</h2>
    <p>Global hotkeys to send text and screenshot</p>
    <a href="/sandboxes/sandbox-7" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 8</h2>
    <p>Added send file from Finder, send URL from Chrome/Safari, send scrolling screenshot via Shottr</p>
    <a href="/sandboxes/sandbox-8" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 9</h2>
    <p>Input bar grows with text and snaps back when text deleted</p>
    <a href="/sandboxes/sandbox-9" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 10</h2>
    <p>Cleaned up the chevrons and + symbols</p>
    <a href="/sandboxes/sandbox-10" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 11</h2>
    <p>Working copy for next iteration</p>
    <a href="/sandboxes/sandbox-11" class="demo-link">Experiment →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 12</h2>
    <p>🚀 COMPLETE PROJECT CLONE - All 10 bricks (5 Buses + 3 Theme + 2 Input) integrated together</p>
    <a href="/sandboxes/sandbox-12" class="demo-link">Test Complete Integration →</a>
  </div>

  <div class="brick-card">
    <h2>Sandbox 13</h2>
    <p>🔄 DUPLICATE CLONE - Copy of Sandbox 12 for progressive Boss Rules application</p>
    <a href="/sandboxes/sandbox-13" class="demo-link">Reimagine Sandbox →</a>
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