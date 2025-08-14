<!-- demo-meta:
{
  "name": "demo-registry",
  "series": "700s",
  "category": "Demo System",
  "description": "Auto-discovery and cataloging of all demos",
  "tags": ["demo", "registry", "discovery", "catalog"],
  "status": "stable",
  "proves": [
    "Discovers all demos using import.meta.glob",
    "Extracts metadata from demo files",
    "Provides search and filter capabilities",
    "Groups demos by series",
    "Calculates statistics"
  ]
}
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { DemoRegistry } from '$lib/bricks/DemoRegistry';
  import type { DemoEntry, DemoStats } from '$lib/bricks/DemoRegistry';
  
  let registry: DemoRegistry;
  let loading = false;
  let error = '';
  let initialized = false;
  
  // Data
  let allDemos: DemoEntry[] = [];
  let stats: DemoStats | null = null;
  let searchResults: DemoEntry[] = [];
  let selectedDemo: DemoEntry | null = null;
  let searchQuery = '';
  let selectedSeries = 'all';
  
  onMount(async () => {
    try {
      registry = new DemoRegistry();
      await registry.init();
      initialized = true;
      
      // Load initial data
      await loadAllDemos();
      
      // Make available for debugging
      if (import.meta.env.DEV) {
        (window as any).__demoRegistry = registry;
      }
    } catch (e) {
      error = `Failed to initialize: ${e}`;
    }
  });
  
  async function loadAllDemos() {
    loading = true;
    error = '';
    try {
      allDemos = registry.getAll();
      stats = registry.getStats();
      console.log(`[DemoRegistry] Loaded ${allDemos.length} demos`);
    } catch (e) {
      error = `Failed to load demos: ${e}`;
    } finally {
      loading = false;
    }
  }
  
  async function refreshRegistry() {
    loading = true;
    error = '';
    try {
      await registry.refresh();
      await loadAllDemos();
      console.log('[DemoRegistry] Registry refreshed');
    } catch (e) {
      error = `Failed to refresh: ${e}`;
    } finally {
      loading = false;
    }
  }
  
  function searchDemos() {
    if (!searchQuery) {
      searchResults = [];
      return;
    }
    
    searchResults = registry.search(searchQuery);
    console.log(`[DemoRegistry] Search for "${searchQuery}" found ${searchResults.length} results`);
  }
  
  function filterBySeries() {
    if (selectedSeries === 'all') {
      searchResults = [];
    } else {
      searchResults = registry.getBySeries(selectedSeries);
      console.log(`[DemoRegistry] Filtered by series "${selectedSeries}": ${searchResults.length} demos`);
    }
  }
  
  function selectDemo(demo: DemoEntry) {
    selectedDemo = demo;
    console.log(`[DemoRegistry] Selected demo:`, demo.metadata);
  }
  
  function reset() {
    searchQuery = '';
    selectedSeries = 'all';
    searchResults = [];
    selectedDemo = null;
    error = '';
  }
  
  $: searchQuery && searchDemos();
  $: selectedSeries && filterBySeries();
  $: displayedDemos = searchResults.length > 0 ? searchResults : allDemos;
</script>

<div class="demo-container">
  <h1>📚 DemoRegistry - Demo Discovery System</h1>
  
  <!-- Status Section -->
  <section class="demo-section">
    <h2>Status</h2>
    <div class="status-grid">
      <div class="status-item">
        <span class="status-indicator {initialized ? 'active' : 'inactive'}"></span>
        <span>Registry: {initialized ? 'Initialized' : 'Not initialized'}</span>
      </div>
      {#if stats}
        <div class="status-item">
          <strong>Total:</strong> {stats.total} demos
        </div>
        <div class="status-item">
          <strong>Stable:</strong> <span style="color: #10b981">{stats.stable}</span>
        </div>
        <div class="status-item">
          <strong>WIP:</strong> <span style="color: #f59e0b">{stats.wip}</span>
        </div>
        <div class="status-item">
          <strong>Broken:</strong> <span style="color: #ef4444">{stats.broken}</span>
        </div>
      {/if}
    </div>
    {#if error}
      <div class="error">{error}</div>
    {/if}
  </section>
  
  <!-- Actions Section -->
  <section class="demo-section">
    <h2>Actions</h2>
    <div class="action-buttons">
      <button 
        class="demo-button"
        on:click={loadAllDemos}
        disabled={!initialized || loading}
      >
        Load All Demos
      </button>
      <button 
        class="demo-button"
        on:click={refreshRegistry}
        disabled={!initialized || loading}
      >
        Refresh Registry
      </button>
      <button 
        class="demo-button reset"
        on:click={reset}
      >
        Reset
      </button>
    </div>
  </section>
  
  <!-- Search & Filter Section -->
  <section class="demo-section">
    <h2>Search & Filter</h2>
    <div class="search-controls">
      <input 
        type="text"
        placeholder="Search demos..."
        bind:value={searchQuery}
        disabled={!initialized}
        class="search-input"
      />
      
      <select 
        bind:value={selectedSeries}
        disabled={!initialized}
        class="series-select"
      >
        <option value="all">All Series</option>
        {#each registry?.getAllSeries() || [] as series}
          <option value={series}>{series}</option>
        {/each}
      </select>
    </div>
  </section>
  
  <!-- Discovered Demos Section -->
  <section class="demo-section">
    <h2>Discovered Demos ({displayedDemos.length})</h2>
    {#if loading}
      <p>Loading demos...</p>
    {:else if displayedDemos.length === 0}
      <p>No demos found. Create some demos in /src/routes/demo/*/</p>
    {:else}
      <div class="demo-grid">
        {#each displayedDemos as demo}
          <div 
            class="demo-card"
            class:selected={selectedDemo?.metadata.id === demo.metadata.id}
            on:click={() => selectDemo(demo)}
          >
            <div class="demo-card-header">
              <strong>{demo.metadata.name}</strong>
              <span class="status-badge {demo.metadata.status}">{demo.metadata.status}</span>
            </div>
            <p class="demo-description">{demo.metadata.description}</p>
            <div class="demo-meta">
              <span class="series-badge">{demo.metadata.series}</span>
              <span class="category-badge">{demo.metadata.category}</span>
            </div>
            <div class="demo-tags">
              {#each demo.metadata.tags.slice(0, 3) as tag}
                <span class="tag">#{tag}</span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
  
  <!-- Selected Demo Details -->
  {#if selectedDemo}
    <section class="demo-section">
      <h2>Selected Demo Details</h2>
      <pre>{JSON.stringify(selectedDemo.metadata, null, 2)}</pre>
      <p class="demo-path">📁 Path: {selectedDemo.path}</p>
      <a href="/demo/{selectedDemo.metadata.id}" class="demo-link">
        🚀 Open Demo →
      </a>
    </section>
  {/if}
  
  <!-- Stats Section -->
  {#if stats}
    <section class="demo-section">
      <h2>Statistics</h2>
      <div class="stats-grid">
        <div>
          <strong>By Series:</strong>
          <ul>
            {#each Object.entries(stats.bySeries) as [series, count]}
              <li>{series}: {count}</li>
            {/each}
          </ul>
        </div>
        <div>
          <strong>By Category:</strong>
          <ul>
            {#each Object.entries(stats.byCategory) as [category, count]}
              <li>{category}: {count}</li>
            {/each}
          </ul>
        </div>
      </div>
    </section>
  {/if}
  
  <!-- Debug Section -->
  <section class="demo-section">
    <h2>Debug Info</h2>
    <p>📝 Registry available at <code>window.__demoRegistry</code> (DEV mode)</p>
    <p>🔧 Config loaded from <code>aetherVault/config/demoRegistry.json</code></p>
    <p>🔍 Uses Vite's import.meta.glob for discovery</p>
    <p>⏰ Last refresh: {registry?.getLastRefresh()?.toLocaleString() || 'Never'}</p>
  </section>
</div>

<style>
  .demo-container {
    padding: 2rem;
    max-width: 1400px;
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
  
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .status-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  
  .status-indicator.active {
    background: #10b981;
  }
  
  .status-indicator.inactive {
    background: #ef4444;
  }
  
  .action-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .demo-button {
    padding: 0.5rem 1rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .demo-button:hover {
    background: #4f46e5;
  }
  
  .demo-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .demo-button.reset {
    background: #ef4444;
  }
  
  .demo-button.reset:hover {
    background: #dc2626;
  }
  
  .search-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .search-input {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
  }
  
  .series-select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    background: white;
  }
  
  .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
  
  .demo-card {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .demo-card:hover {
    border-color: #6366f1;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .demo-card.selected {
    border-color: #6366f1;
    background: #eff6ff;
  }
  
  .demo-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .status-badge.stable {
    background: #d1fae5;
    color: #065f46;
  }
  
  .status-badge.wip {
    background: #fed7aa;
    color: #92400e;
  }
  
  .status-badge.broken {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .demo-description {
    margin: 0.5rem 0;
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .demo-meta {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  
  .series-badge,
  .category-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  
  .series-badge {
    background: #ddd6fe;
    color: #6b21a8;
  }
  
  .category-badge {
    background: #dbeafe;
    color: #1e40af;
  }
  
  .demo-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .tag {
    padding: 0.125rem 0.375rem;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  .demo-path {
    margin: 1rem 0;
    padding: 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.875rem;
  }
  
  .demo-link {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: #6366f1;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    margin-top: 0.5rem;
  }
  
  .demo-link:hover {
    background: #4f46e5;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
  }
  
  .stats-grid ul {
    margin: 0.5rem 0 0;
    padding-left: 1.5rem;
  }
  
  .error {
    color: #ef4444;
    padding: 1rem;
    background: #fee2e2;
    border-radius: 6px;
    margin-top: 1rem;
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
</style>