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

  onMount(async () => {
    console.log('🚀 AtomicAether Main App Starting...');
    
    try {
      // Initialize theme system
      await themeApplier.initialize();
      await themeSelector.selectTheme('rainy-night');
      
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
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  
</style>