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
    <a href="/" class="back-button" title="Back to Chat">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Back to Chat</span>
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
    justify-content: center;
    height: 60px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .back-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(223, 208, 184, 0.8);
    text-decoration: none;
    transition: all 0.2s ease;
    font-size: 14px;
  }
  
  .back-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(223, 208, 184, 1);
    transform: translateX(-2px);
  }
</style>