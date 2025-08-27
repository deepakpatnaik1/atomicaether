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
  import { SelectionPersistenceBrick } from '$lib/bricks/SelectionPersistenceBrick/core/SelectionPersistenceBrick';
  import { SuperJournalBrick } from '$lib/bricks/SuperJournalBrick/core/SuperJournalBrick';
  
  let messageTurnBrick;
  let llmBrick;
  let selectionPersistenceBrick;
  let superJournalBrick;
  let scrollbackRef: HTMLDivElement;

  // Handle wheel events on the main container
  function handleMainWheel(event: WheelEvent) {
    // Forward the wheel event to the scrollback container
    if (scrollbackRef) {
      scrollbackRef.scrollTop += event.deltaY;
    }
  }

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
      
      
      // Initialize SuperJournal - Message pair persistence (Rule 9: Add, don't modify existing)
      superJournalBrick = new SuperJournalBrick(eventBus, stateBus, configBus, errorBus);
      
      // App ready
      eventBus.publish('app:ready', { timestamp: Date.now() });
      console.log('✅ App initialized successfully');
      
    } catch (error) {
      console.error('💥 App initialization failed:', error);
      errorBus.reportFatal(error as Error, 'MainApp');
    }
  });
  
</script>

<main class="app flex-column position-relative" onwheel={handleMainWheel}>
  
  <MessageScrollback bind:scrollContainer={scrollbackRef} />
  <InputBarUI />
</main>

<style>
  @import '$lib/../styles/shared.css';
  
  :global(body) {
    background: var(--app-background) !important;
    color: var(--text-color) !important;
    margin: var(--spacing-reset);
    padding: var(--spacing-reset);
    font-family: var(--typography-font-family-system);
  }
  
  .app {
    height: var(--app-container-height);
    width: 100vw;
    overflow: hidden;
  }
  
</style>