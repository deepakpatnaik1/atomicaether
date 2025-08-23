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
  
  let messageTurnBrick;
  let llmBrick;
  let superJournalBrick;

  onMount(async () => {
    console.log('🚀 AtomicAether Main App Starting...');
    
    try {
      // Initialize theme system
      await themeApplier.initialize();
      await themeSelector.selectTheme('rainy-night');
      
      // Initialize MessageTurnBrick - orchestrates conversation turns
      messageTurnBrick = new MessageTurnBrick(eventBus, stateBus, configBus, errorBus);
      
      // Initialize LLMBrick - it will listen from the void
      llmBrick = new LLMBrick(eventBus, configBus, stateBus, errorBus);
      
      // Initialize SuperJournal - Deep Memory System
      superJournalBrick = new SuperJournalBrick(eventBus, stateBus, configBus, errorBus);
      console.log('🧠 SuperJournal: Deep memory activated - recording everything forever');
      
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
  }
  
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  
</style>