<script lang="ts">
  import { onMount } from 'svelte';
  import { DemoRegistry } from '$lib/bricks/DemoRegistry';
  import type { DemoEntry, DemoStats } from '$lib/bricks/DemoRegistry';
  import type { GalleryConfig, GroupedDemos, FilterState } from '../models/GalleryTypes';
  import DemoCard from '../components/DemoCard.svelte';
  import FilterBar from '../components/FilterBar.svelte';
  import StatsBar from '../components/StatsBar.svelte';
  
  let config: GalleryConfig | null = null;
  let registry: DemoRegistry;
  let loading = true;
  let error = '';
  
  // Data
  let allDemos: DemoEntry[] = [];
  let filteredDemos: DemoEntry[] = [];
  let groupedDemos: GroupedDemos[] = [];
  let stats: DemoStats | null = null;
  
  // Filter state
  let filters: FilterState = {
    searchQuery: '',
    selectedSeries: 'all',
    selectedStatus: 'all',
    selectedCategory: 'all',
    sortBy: 'series'
  };
  
  // Lists for dropdowns
  let seriesList: string[] = [];
  let categoriesList: string[] = [];
  
  onMount(async () => {
    try {
      // Load config
      const response = await fetch('/config/demoGallery.json');
      if (!response.ok) {
        throw new Error('Failed to load gallery config');
      }
      config = await response.json();
      
      // Initialize registry
      registry = new DemoRegistry();
      await registry.init();
      
      // Load demos
      allDemos = registry.getAll();
      stats = registry.getStats();
      seriesList = registry.getAllSeries();
      categoriesList = registry.getAllCategories();
      
      // Initial filter
      applyFilters();
      
      loading = false;
    } catch (e) {
      error = `Failed to initialize gallery: ${e}`;
      loading = false;
    }
  });
  
  function applyFilters() {
    if (!registry) return;
    
    let demos = allDemos;
    
    // Apply search
    if (filters.searchQuery) {
      demos = registry.search(filters.searchQuery);
    }
    
    // Apply series filter
    if (filters.selectedSeries !== 'all') {
      demos = demos.filter(d => d.metadata.series === filters.selectedSeries);
    }
    
    // Apply status filter
    if (filters.selectedStatus !== 'all') {
      demos = demos.filter(d => d.metadata.status === filters.selectedStatus);
    }
    
    // Apply category filter
    if (filters.selectedCategory !== 'all') {
      demos = demos.filter(d => d.metadata.category === filters.selectedCategory);
    }
    
    // Hide broken demos if configured
    if (config?.features.showBrokenDemos === false) {
      demos = demos.filter(d => d.metadata.status !== 'broken');
    }
    
    // Sort
    demos = sortDemos(demos, filters.sortBy);
    
    filteredDemos = demos;
    
    // Group if enabled
    if (config?.features.groupBySeries) {
      groupedDemos = groupDemosBySeries(demos);
    } else {
      groupedDemos = [{ series: 'all', demos, color: '#6b7280' }];
    }
  }
  
  function sortDemos(demos: DemoEntry[], sortBy: string): DemoEntry[] {
    return [...demos].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.metadata.name.localeCompare(b.metadata.name);
        case 'status':
          return a.metadata.status.localeCompare(b.metadata.status);
        case 'category':
          return a.metadata.category.localeCompare(b.metadata.category);
        case 'series':
        default:
          return a.metadata.series.localeCompare(b.metadata.series);
      }
    });
  }
  
  function groupDemosBySeries(demos: DemoEntry[]): GroupedDemos[] {
    const groups = new Map<string, DemoEntry[]>();
    
    demos.forEach(demo => {
      const series = demo.metadata.series;
      if (!groups.has(series)) {
        groups.set(series, []);
      }
      groups.get(series)!.push(demo);
    });
    
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([series, demos]) => ({
        series,
        demos,
        color: config?.styling.seriesColors[series] || '#6b7280'
      }))
      .filter(group => config?.features.showEmptyGroups || group.demos.length > 0);
  }
  
  // Reactive filtering
  $: filters, applyFilters();
</script>

<div class="gallery-container" style="max-width: {config?.layout.containerMaxWidth || '1400px'}">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading demo gallery...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <h2>Error</h2>
      <p>{error}</p>
    </div>
  {:else if config}
    <header class="gallery-header">
      <h1>{config.text.title}</h1>
      <p>{config.text.subtitle}</p>
    </header>
    
    {#if config.features.showStats && stats}
      <StatsBar 
        {stats} 
        filteredCount={filteredDemos.length}
        totalCount={allDemos.length}
      />
    {/if}
    
    {#if config.features.showFilters}
      <FilterBar
        bind:searchQuery={filters.searchQuery}
        bind:selectedSeries={filters.selectedSeries}
        bind:selectedStatus={filters.selectedStatus}
        bind:selectedCategory={filters.selectedCategory}
        bind:sortBy={filters.sortBy}
        {seriesList}
        {categoriesList}
        searchPlaceholder={config.text.searchPlaceholder}
      />
    {/if}
    
    {#if filteredDemos.length === 0}
      <div class="empty-state">
        <p>{config.text.emptyState}</p>
      </div>
    {:else}
      <div class="gallery-content">
        {#each groupedDemos as group}
          {#if config.features.groupBySeries && group.series !== 'all'}
            <h2 class="series-header" style="color: {group.color}">
              {group.series.toUpperCase()} Series
              <span class="series-count">({group.demos.length})</span>
            </h2>
          {/if}
          
          <div 
            class="demo-grid"
            style="
              grid-template-columns: repeat({config.layout.cardsPerRow}, minmax({config.layout.minCardWidth}, {config.layout.maxCardWidth}));
              gap: {config.layout.gap};
            "
          >
            {#each group.demos as demo}
              <DemoCard 
                {demo}
                seriesColor={group.color}
                cardStyle={config.styling.cardStyle}
                animations={config.styling.animations}
              />
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .gallery-container {
    margin: 0 auto;
    padding: 2rem;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
  }
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-state {
    background: #fee2e2;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
  }
  
  .error-state h2 {
    color: #ef4444;
    margin-bottom: 1rem;
  }
  
  .gallery-header {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  .gallery-header h1 {
    font-size: 3rem;
    font-weight: bold;
    color: white;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    margin: 0 0 0.5rem 0;
  }
  
  .gallery-header p {
    color: white;
    font-size: 1.125rem;
    opacity: 0.95;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
  }
  
  .gallery-content {
    margin-top: 2rem;
  }
  
  .series-header {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 2.5rem 0 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .series-count {
    font-size: 1rem;
    font-weight: normal;
    opacity: 0.6;
  }
  
  .demo-grid {
    display: grid;
    margin-bottom: 2rem;
  }
  
  .empty-state {
    background: #f9fafb;
    border-radius: 12px;
    padding: 4rem 2rem;
    text-align: center;
    margin-top: 2rem;
  }
  
  .empty-state p {
    color: #6b7280;
    font-size: 1.125rem;
  }
  
  @media (max-width: 768px) {
    .gallery-container {
      padding: 1rem;
    }
    
    .gallery-header h1 {
      font-size: 2rem;
    }
    
    .demo-grid {
      grid-template-columns: 1fr !important;
    }
  }
</style>