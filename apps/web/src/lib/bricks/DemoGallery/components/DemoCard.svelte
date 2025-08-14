<script lang="ts">
  import type { DemoEntry } from '$lib/bricks/DemoRegistry';
  
  export let demo: DemoEntry;
  export let seriesColor: string = '#6b7280';
  export let cardStyle: 'flat' | 'elevated' | 'bordered' = 'elevated';
  export let animations: boolean = true;
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'stable': return '#10b981';
      case 'wip': return '#f59e0b';
      case 'broken': return '#ef4444';
      default: return '#6b7280';
    }
  }
  
  function getStatusEmoji(status: string): string {
    switch (status) {
      case 'stable': return '✅';
      case 'wip': return '🚧';
      case 'broken': return '❌';
      default: return '❓';
    }
  }
</script>

<a 
  href="/demo/{demo.metadata.id}" 
  class="demo-card {cardStyle}"
  class:animated={animations}
  style="--series-color: {seriesColor}"
>
  <div class="card-header">
    <h3>{demo.metadata.name}</h3>
    <span 
      class="status-badge"
      style="background: {getStatusColor(demo.metadata.status)}20; color: {getStatusColor(demo.metadata.status)}"
    >
      {getStatusEmoji(demo.metadata.status)} {demo.metadata.status}
    </span>
  </div>
  
  <p class="card-description">{demo.metadata.description}</p>
  
  <div class="card-meta">
    <span class="series-badge" style="background: {seriesColor}20; color: {seriesColor}">
      {demo.metadata.series}
    </span>
    <span class="category-badge">
      {demo.metadata.category}
    </span>
  </div>
  
  {#if demo.metadata.proves && demo.metadata.proves.length > 0}
    <div class="proves-section">
      <strong>Proves:</strong>
      <ul>
        {#each demo.metadata.proves.slice(0, 2) as proof}
          <li>{proof}</li>
        {/each}
        {#if demo.metadata.proves.length > 2}
          <li class="more">+{demo.metadata.proves.length - 2} more</li>
        {/if}
      </ul>
    </div>
  {/if}
  
  <div class="card-tags">
    {#each demo.metadata.tags.slice(0, 3) as tag}
      <span class="tag">#{tag}</span>
    {/each}
    {#if demo.metadata.tags.length > 3}
      <span class="tag more">+{demo.metadata.tags.length - 3}</span>
    {/if}
  </div>
</a>

<style>
  .demo-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 10px;
    text-decoration: none;
    color: #1f2937;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .demo-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--series-color);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  
  .demo-card.flat {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
  }
  
  .demo-card.elevated {
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .demo-card.bordered {
    background: white;
    border: 2px solid #e5e7eb;
  }
  
  .demo-card.animated:hover {
    transform: translateY(-4px);
  }
  
  .demo-card.elevated.animated:hover {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  }
  
  .demo-card.bordered.animated:hover {
    border-color: var(--series-color);
  }
  
  .demo-card:hover::before {
    transform: scaleX(1);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .card-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    flex: 1;
  }
  
  .status-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 20px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    white-space: nowrap;
  }
  
  .card-description {
    margin: 0;
    color: #6b7280;
    font-size: 0.75rem;
    line-height: 1.4;
  }
  
  .card-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .series-badge,
  .category-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
  }
  
  .series-badge {
    text-transform: uppercase;
  }
  
  .category-badge {
    background: #f3f4f6;
    color: #4b5563;
  }
  
  .proves-section {
    font-size: 0.625rem;
    color: #6b7280;
  }
  
  .proves-section strong {
    color: #374151;
    font-weight: 600;
  }
  
  .proves-section ul {
    margin: 0.125rem 0 0;
    padding-left: 1rem;
    list-style: disc;
  }
  
  .proves-section li {
    margin: 0.125rem 0;
  }
  
  .proves-section li.more {
    color: #9ca3af;
    font-style: italic;
  }
  
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-top: auto;
  }
  
  .tag {
    padding: 0.125rem 0.375rem;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 0.625rem;
    color: #6b7280;
  }
  
  .tag.more {
    background: #e5e7eb;
    font-style: italic;
  }
</style>