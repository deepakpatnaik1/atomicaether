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
  
  // Import dual-response bricks for orchestrator integration
  import { DualResponseOrchestratorBrick } from '$lib/bricks/DualResponseOrchestratorBrick';
  import { DualResponseBrick } from '$lib/bricks/DualResponseBrick';
  import { ResponseRouterBrick } from '$lib/bricks/ResponseRouterBrick';
  import { SynchronizedDeletionBrick } from '$lib/bricks/SynchronizedDeletionBrick';
  import { JournalBrick } from '$lib/bricks/JournalBrick';
  
  let messageTurnBrick;
  let llmBrick;
  let selectionPersistenceBrick;
  let superJournalBrick;
  let scrollbackRef: HTMLDivElement;

  // Dual-response orchestrator bricks
  let dualResponseOrchestratorBrick;
  let dualResponseBrick;
  let responseRouterBrick;
  let synchronizedDeletionBrick;
  let journalBrick;

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
      
      // Initialize dual-response orchestrator system
      // Following existing patterns: Constructor injection for simple bricks, setBuses() for orchestrators
      journalBrick = new JournalBrick(eventBus, stateBus, configBus, errorBus);
      
      dualResponseOrchestratorBrick = new DualResponseOrchestratorBrick();
      await dualResponseOrchestratorBrick.setBuses({ eventBus, configBus, stateBus, errorBus });
      
      dualResponseBrick = new DualResponseBrick();
      await dualResponseBrick.setBuses({ eventBus, configBus, stateBus, errorBus });
      
      responseRouterBrick = new ResponseRouterBrick(eventBus, configBus, stateBus, errorBus);
      
      synchronizedDeletionBrick = new SynchronizedDeletionBrick();
      await synchronizedDeletionBrick.setBuses({ eventBus, configBus, stateBus, errorBus });
      
      // Wire storage brick dependencies
      responseRouterBrick.setStorageBricks(superJournalBrick, journalBrick);
      
      // Register all brick dependencies with orchestrator
      dualResponseOrchestratorBrick.setBricks({
        messageTurnBrick,
        machineTrimBrick: null, // Future implementation in Branch 3
        responseRouterBrick,
        superJournalBrick,
        journalBrick,
        synchronizedDeletionBrick,
        dualResponseBrick,
        llmBrick
      });
      
      // Initialize orchestrator with all dependencies
      await dualResponseOrchestratorBrick.initialize();
      
      // Basic health check validation
      const healthCheck = await dualResponseOrchestratorBrick.healthCheck();
      if (healthCheck.healthy) {
        console.log('✅ Dual-response orchestrator system initialized');
      } else {
        console.warn('⚠️ Orchestrator health issues:', healthCheck.issues);
      }
      
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