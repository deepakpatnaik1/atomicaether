<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    eventBus, 
    errorBus, 
    stateBus, 
    configBus, 
    themeApplier
  } from '$lib/buses';
  import { RecycleBinScrollback } from '$lib/bricks/RecycleBinScrollback';
  import { RecycleBinBrick } from '$lib/bricks/RecycleBinBrick';
  
  let recycleBinBrick;

  onMount(async () => {
    console.log('🗑️ RecycleBin Page Loading...');
    
    try {
      // Initialize theme system
      await themeApplier.initialize();
      
      // Initialize RecycleBin brick if not already initialized
      recycleBinBrick = new RecycleBinBrick(eventBus, stateBus, configBus, errorBus);
      
      // Request recycle bin data
      eventBus.publish('recyclebin:request', {});
      
      console.log('✅ RecycleBin page initialized');
      
    } catch (error) {
      console.error('💥 RecycleBin initialization failed:', error);
      errorBus.reportFatal(error as Error, 'RecycleBinPage');
    }
  });
</script>

<main class="recyclebin-app flex-column position-relative">
  <!-- Header with back button -->
  <div class="recyclebin-header">
    <a href="/" class="back-button icon-button" title="Back to Chat" aria-label="Back to Chat">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="12" y1="8" x2="3" y2="8"></line>
        <polyline points="8 13 3 8 8 3"></polyline>
      </svg>
    </a>
  </div>
  
  <!-- Scrollback for deleted messages -->
  <RecycleBinScrollback />
</main>

<style>
  @import '$lib/../styles/shared.css';
  
  :global(body) {
    background: var(--app-background) !important;
    color: var(--text-color) !important;
    transition: var(--global-body-transition);
    margin: var(--spacing-reset);
    padding: var(--spacing-reset);
    font-family: var(--typography-font-family-system);
  }
  
  .recyclebin-app {
    height: var(--app-container-height);
    overflow: hidden;
  }
  
  .recyclebin-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 60px;
    border-bottom: var(--borders-style-subtle);
    padding-left: var(--spacing-standard);
  }
  
  .back-button {
    text-decoration: none;
  }
</style>