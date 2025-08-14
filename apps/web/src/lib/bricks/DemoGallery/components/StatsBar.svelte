<script lang="ts">
  import type { DemoStats } from '$lib/bricks/DemoRegistry';
  
  export let stats: DemoStats | null = null;
  export let filteredCount: number = 0;
  export let totalCount: number = 0;
  
  $: isFiltered = filteredCount > 0 && filteredCount < totalCount;
</script>

{#if stats}
  <div class="stats-bar">
    <div class="stat-card total">
      <div class="stat-icon">📊</div>
      <div class="stat-value">{isFiltered ? filteredCount : stats.total}</div>
      <div class="stat-label">
        {isFiltered ? 'Showing' : 'Total Demos'}
      </div>
      {#if isFiltered}
        <div class="stat-sublabel">of {totalCount}</div>
      {/if}
    </div>
    
    <div class="stat-card stable">
      <div class="stat-icon">✅</div>
      <div class="stat-value">{stats.stable}</div>
      <div class="stat-label">Stable</div>
    </div>
    
    <div class="stat-card wip">
      <div class="stat-icon">🚧</div>
      <div class="stat-value">{stats.wip}</div>
      <div class="stat-label">WIP</div>
    </div>
    
    <div class="stat-card broken">
      <div class="stat-icon">❌</div>
      <div class="stat-value">{stats.broken}</div>
      <div class="stat-label">Broken</div>
    </div>
    
    <div class="stat-card series">
      <div class="stat-icon">📚</div>
      <div class="stat-value">{Object.keys(stats.bySeries).length}</div>
      <div class="stat-label">Series</div>
    </div>
    
    <div class="stat-card categories">
      <div class="stat-icon">🏷️</div>
      <div class="stat-value">{Object.keys(stats.byCategory).length}</div>
      <div class="stat-label">Categories</div>
    </div>
  </div>
{/if}

<style>
  .stats-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: white;
    border-radius: 12px;
    padding: 1.25rem;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
  }
  
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #e5e7eb;
  }
  
  .stat-card.total::before {
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
  }
  
  .stat-card.stable::before {
    background: #10b981;
  }
  
  .stat-card.wip::before {
    background: #f59e0b;
  }
  
  .stat-card.broken::before {
    background: #ef4444;
  }
  
  .stat-card.series::before {
    background: #3b82f6;
  }
  
  .stat-card.categories::before {
    background: #8b5cf6;
  }
  
  .stat-icon {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #111827;
    line-height: 1;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }
  
  .stat-sublabel {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-top: 0.25rem;
  }
  
  @media (max-width: 768px) {
    .stats-bar {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    }
    
    .stat-card {
      padding: 1rem;
    }
    
    .stat-value {
      font-size: 1.5rem;
    }
  }
</style>