<script lang="ts">
  export let searchQuery: string = '';
  export let selectedSeries: string = 'all';
  export let selectedStatus: string = 'all';
  export let selectedCategory: string = 'all';
  export let sortBy: string = 'series';
  
  export let seriesList: string[] = [];
  export let categoriesList: string[] = [];
  export let searchPlaceholder: string = 'Search demos...';
  
  let searchInput: HTMLInputElement;
  
  function clearFilters() {
    searchQuery = '';
    selectedSeries = 'all';
    selectedStatus = 'all';
    selectedCategory = 'all';
    sortBy = 'series';
    if (searchInput) searchInput.focus();
  }
  
  $: hasActiveFilters = searchQuery || selectedSeries !== 'all' || 
                        selectedStatus !== 'all' || selectedCategory !== 'all';
</script>

<div class="filter-bar">
  <select bind:value={selectedSeries} class="filter-select">
    <option value="all">All Series</option>
    {#each seriesList as series}
      <option value={series}>{series}</option>
    {/each}
  </select>
  
  <select bind:value={selectedStatus} class="filter-select">
    <option value="all">All Status</option>
    <option value="stable">✅ Stable</option>
    <option value="wip">🚧 WIP</option>
    <option value="broken">❌ Broken</option>
  </select>
  
  <select bind:value={selectedCategory} class="filter-select">
    <option value="all">All Categories</option>
    {#each categoriesList as category}
      <option value={category}>{category}</option>
    {/each}
  </select>
  
  <select bind:value={sortBy} class="filter-select">
    <option value="series">Sort by Series</option>
    <option value="name">Sort by Name</option>
    <option value="status">Sort by Status</option>
    <option value="category">Sort by Category</option>
  </select>
  
  {#if hasActiveFilters}
    <button on:click={clearFilters} class="clear-button">
      Clear Filters
    </button>
  {/if}
  
  <div class="search-wrapper">
    <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      bind:this={searchInput}
      type="text"
      bind:value={searchQuery}
      placeholder={searchPlaceholder}
      class="search-input"
    />
  </div>
</div>

<style>
  .filter-bar {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .search-wrapper {
    position: relative;
    flex: 0 1 240px;
  }
  
  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    color: #9ca3af;
    pointer-events: none;
  }
  
  .search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 3rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #6366f1;
  }
  
  .filter-select {
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    background: white;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 1.5rem;
    appearance: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .filter-select:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  .clear-button {
    padding: 0.75rem 1.25rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .clear-button:hover {
    background: #dc2626;
  }
  
  @media (max-width: 768px) {
    .filter-bar {
      padding: 1rem;
    }
    
    .search-wrapper {
      width: 100%;
    }
  }
</style>