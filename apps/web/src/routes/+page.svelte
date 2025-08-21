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
  import { MessageScrollback } from '$lib/components/MessageScrollback';

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
  <a href="/demo/scrollback" class="demo-link">ScrollbackBrick Demo →</a>
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
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  
  .demo-link {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 8px 16px;
    background: rgba(249, 115, 22, 0.2);
    color: #f97316;
    border: 1px solid rgba(249, 115, 22, 0.3);
    border-radius: 4px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 600;
    z-index: 1000;
    transition: background 0.2s;
  }
  
  .demo-link:hover {
    background: rgba(249, 115, 22, 0.3);
  }
  
</style>