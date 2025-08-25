<script lang="ts">
  import { onMount } from 'svelte';
  
  // Import all systems from main lib (now contains sandbox-13 full structure)
  import { 
    eventBus, 
    errorBus, 
    stateBus, 
    configBus, 
    themeRegistry,
    themeSelector,
    themeApplier
  } from '$lib/buses';
  
  // Import all bricks from main lib (now contains sandbox-13 InputBarUI)
  import { InputBarUI } from '$lib/bricks/InputBarUI';
  import { MessageScrollback } from '$lib/bricks/MessageScrollback';
  import { MessageTurnBrick } from '$lib/bricks/MessageTurnBrick';
  import { LLMBrick } from '$lib/bricks/LLMBrick';
  import { SuperJournalBrick } from '$lib/bricks/SuperJournalBrick';
  import { SelectionPersistenceBrick } from '$lib/bricks/SelectionPersistenceBrick/core/SelectionPersistenceBrick';
  import { RecycleBinBrick } from '$lib/bricks/RecycleBinBrick';
  
  let messageTurnBrick;
  let llmBrick;
  let superJournalBrick;
  let selectionPersistenceBrick;
  let recycleBinBrick;

  onMount(async () => {
    console.log('🚀 AtomicAether Main App Starting...');
    
    try {
      // Initialize theme system
      await themeApplier.initialize();
      await themeSelector.selectTheme('rainy-night');
      
      // Initialize SelectionPersistenceBrick - handles persisting user selections
      selectionPersistenceBrick = new SelectionPersistenceBrick();
      
      // Initialize MessageTurnBrick - orchestrates conversation turns
      messageTurnBrick = new MessageTurnBrick(eventBus, stateBus, configBus, errorBus);
      
      // Initialize LLMBrick - it will listen from the void
      llmBrick = new LLMBrick(eventBus, configBus, stateBus, errorBus);
      
      // Initialize SuperJournal - Deep Memory System
      superJournalBrick = new SuperJournalBrick(eventBus, stateBus, configBus, errorBus);
      console.log('🧠 SuperJournal: Deep memory activated - recording everything forever');
      
      // Initialize RecycleBin - Trash management system
      recycleBinBrick = new RecycleBinBrick(eventBus, stateBus, configBus, errorBus);
      console.log('🗑️ RecycleBin: Trash management system activated');
      
      // App ready
      eventBus.publish('app:ready', { timestamp: Date.now() });
      console.log('✅ App initialized successfully');
      
    } catch (error) {
      console.error('💥 App initialization failed:', error);
      errorBus.reportFatal(error as Error, 'MainApp');
    }
  });
  
</script>

<main class="app">
  <!-- Recycle Bin Icon -->
  <a href="/recyclebin" class="recycle-bin-icon" title="Recycle Bin">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  </a>
  
  <MessageScrollback />
  <InputBarUI />
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
  
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  
  .recycle-bin-icon {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(223, 208, 184, 0.6);
    text-decoration: none;
    transition: all 0.2s ease;
    z-index: 100;
  }
  
  .recycle-bin-icon:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(223, 208, 184, 0.9);
    transform: scale(1.05);
  }
  
  .recycle-bin-icon:active {
    transform: scale(0.95);
  }
  
</style>