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

<main class="recyclebin-app">
  <!-- Header with centered back button -->
  <div class="recyclebin-header">
    <a href="/" class="back-button" title="Back to Chat" aria-label="Back to Chat">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="12" y1="8" x2="3" y2="8"></line>
        <polyline points="8 13 3 8 8 3"></polyline>
      </svg>
    </a>
  </div>
  
  <!-- Scrollback for deleted messages -->
  <RecycleBinScrollback />
</main>

<style>
  :global(body) {
    background: var(--app-background, #222831) !important;
    color: var(--text-color, #e0e0e0) !important;
    transition: all 0.3s ease;
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .recyclebin-app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  
  .recyclebin-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 60px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-left: 20px;
  }
  
  .back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    transition: all 0.2s ease;
  }
  
  .back-button:hover {
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }
  
  .back-button:active {
    transform: scale(0.95);
  }
</style>