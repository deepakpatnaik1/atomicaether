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

<main class="app flex-column position-relative">
  <!-- Recycle Bin Icon -->
  <a href="/recyclebin" class="recycle-bin-icon icon-button" title="Recycle Bin" aria-label="Recycle Bin">
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M5.5 2.5V1.5C5.5 1.22386 5.72386 1 6 1H10C10.2761 1 10.5 1.22386 10.5 1.5V2.5M2 4H14M3 4V13.5C3 14.0523 3.44772 14.5 4 14.5H12C12.5523 14.5 13 14.0523 13 13.5V4M6.5 7V11.5M9.5 7V11.5"/>
    </svg>
  </a>
  
  <MessageScrollback />
  <InputBarUI />
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
  
  .app {
    height: var(--app-container-height);
    overflow: hidden;
  }
  
  .recycle-bin-icon {
    position: fixed;
    bottom: var(--spacing-standard);
    right: var(--spacing-standard);
    z-index: 100;
    text-decoration: none;
  }
</style>