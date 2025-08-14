<!-- demo-meta:
{
  "name": "demo-gallery",
  "series": "700s",
  "category": "Demo System",
  "description": "Beautiful card-based gallery UI for browsing all demos",
  "tags": ["demo", "gallery", "ui", "cards"],
  "status": "stable",
  "proves": [
    "Card-based UI with hover effects",
    "Search and filter functionality",
    "Grouping by series with colors",
    "Statistics display",
    "Responsive grid layout",
    "Meta: Gallery displaying itself!"
  ]
}
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { DemoGallery } from '$lib/bricks/DemoGallery';
  
  let initialized = false;
  let currentStyle = 'elevated';
  let animations = true;
  let groupBySeries = true;
  let showStats = true;
  let showFilters = true;
  
  // Mini config for demo
  let demoConfig = {
    cardStyles: ['flat', 'elevated', 'bordered'],
    description: {
      flat: 'Minimal style with subtle borders',
      elevated: 'Cards with shadows that lift on hover',
      bordered: 'Clean bordered cards with color accents'
    }
  };
  
  onMount(() => {
    initialized = true;
    console.log('[DemoGallery] Demo initialized - showing gallery configuration options');
  });
  
  function toggleStyle() {
    const styles = demoConfig.cardStyles;
    const currentIndex = styles.indexOf(currentStyle);
    currentStyle = styles[(currentIndex + 1) % styles.length];
    console.log(`[DemoGallery] Switched to ${currentStyle} style`);
  }
</script>

<div class="demo-container">
  <h1>🎨 DemoGallery - The Beautiful Demo Browser</h1>
  
  <!-- Status Section -->
  <section class="demo-section">
    <h2>Status</h2>
    <div class="status-indicator {initialized ? 'active' : 'inactive'}">
      Gallery Component: {initialized ? 'Ready' : 'Not initialized'}
    </div>
    <p class="meta-note">
      🤯 <strong>Meta moment:</strong> This demo is displaying inside the gallery that it demonstrates!
      The gallery is showing its own card among all the other demos.
    </p>
  </section>
  
  <!-- Configuration Section -->
  <section class="demo-section">
    <h2>Gallery Configuration</h2>
    
    <div class="config-grid">
      <div class="config-item">
        <label>
          <strong>Card Style:</strong> {currentStyle}
          <button on:click={toggleStyle} class="demo-button">
            Switch Style
          </button>
        </label>
        <p class="config-description">{demoConfig.description[currentStyle]}</p>
      </div>
      
      <div class="config-item">
        <label>
          <input type="checkbox" bind:checked={animations} />
          <strong>Animations</strong>
        </label>
        <p class="config-description">Smooth hover effects and transitions</p>
      </div>
      
      <div class="config-item">
        <label>
          <input type="checkbox" bind:checked={groupBySeries} />
          <strong>Group by Series</strong>
        </label>
        <p class="config-description">Organize demos by their series (100s, 200s, etc.)</p>
      </div>
      
      <div class="config-item">
        <label>
          <input type="checkbox" bind:checked={showStats} />
          <strong>Show Statistics</strong>
        </label>
        <p class="config-description">Display demo counts and status breakdown</p>
      </div>
      
      <div class="config-item">
        <label>
          <input type="checkbox" bind:checked={showFilters} />
          <strong>Show Filters</strong>
        </label>
        <p class="config-description">Enable search and filter controls</p>
      </div>
    </div>
  </section>
  
  <!-- Live Preview Section -->
  <section class="demo-section">
    <h2>Live Gallery Preview</h2>
    <p>Visit the main gallery to see these settings in action:</p>
    <a href="/demo" class="gallery-link">
      🚀 Open Full Demo Gallery
    </a>
    <p class="hint">The gallery auto-discovers all demos including this one!</p>
  </section>
  
  <!-- Features Section -->
  <section class="demo-section">
    <h2>Gallery Features</h2>
    <ul class="features-list">
      <li>✨ Auto-discovery via DemoRegistry</li>
      <li>🎨 Beautiful card-based UI</li>
      <li>🔍 Real-time search</li>
      <li>📊 Filter by series, status, category</li>
      <li>🎯 Grouped display with color coding</li>
      <li>📈 Statistics bar</li>
      <li>📱 Responsive grid layout</li>
      <li>⚡ Smooth animations</li>
      <li>🎭 Multiple card styles</li>
      <li>🔄 The gallery shows itself (meta!)</li>
    </ul>
  </section>
  
  <!-- Debug Section -->
  <section class="demo-section">
    <h2>Debug Info</h2>
    <p>📝 Gallery uses DemoRegistry for discovery</p>
    <p>🔧 Config loaded from <code>aetherVault/config/demoGallery.json</code></p>
    <p>🎨 Three card styles: flat, elevated, bordered</p>
    <p>🌈 Each series has its own color</p>
    <p>🔄 This demo appears in the gallery it demonstrates!</p>
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
  
  .status-indicator {
    padding: 1rem;
    border-radius: 8px;
    font-weight: 500;
  }
  
  .status-indicator.active {
    background: #d1fae5;
    color: #065f46;
  }
  
  .status-indicator.inactive {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .meta-note {
    margin-top: 1rem;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea20, #764ba220);
    border-left: 4px solid #6366f1;
    border-radius: 4px;
  }
  
  .config-grid {
    display: grid;
    gap: 1.5rem;
  }
  
  .config-item {
    padding: 1rem;
    background: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
  
  .config-item label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .config-item input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }
  
  .config-description {
    margin: 0.5rem 0 0;
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .demo-button {
    padding: 0.375rem 0.75rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    margin-left: 0.5rem;
  }
  
  .demo-button:hover {
    background: #4f46e5;
  }
  
  .gallery-link {
    display: inline-block;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    margin: 1rem 0;
    transition: transform 0.2s;
  }
  
  .gallery-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }
  
  .hint {
    margin-top: 1rem;
    color: #6b7280;
    font-size: 0.875rem;
    font-style: italic;
  }
  
  .features-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  .features-list li {
    padding: 0.75rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }
</style>