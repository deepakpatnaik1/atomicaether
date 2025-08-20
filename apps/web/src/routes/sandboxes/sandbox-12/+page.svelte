<script lang="ts">
  import { onMount } from 'svelte';
  
  // Import all systems from local clone
  import { 
    eventBus, 
    errorBus, 
    stateBus, 
    configBus, 
    themeRegistry,
    themeSelector,
    themeApplier
  } from './lib/buses';
  
  // Import all bricks from local clone
  import { InputBarUI } from './lib/bricks/InputBarUI';

  let appReady = $state(false);

  onMount(async () => {
    console.log('🚀 AtomicAether Main App Starting...');
    
    try {
      // Initialize theme system
      await themeApplier.initialize();
      await themeSelector.selectTheme('rainy-night');
      
      // App ready
      appReady = true;
      eventBus.publish('app:ready', { timestamp: Date.now() });
      console.log('✅ App initialized successfully');
      
    } catch (error) {
      console.error('💥 App initialization failed:', error);
      errorBus.reportFatal(error as Error, 'MainApp');
    }
  });
  
</script>

<nav>
  <a href="/sandboxes">← Back to Sandboxes</a>
</nav>

{#if appReady}
  <main class="app">
    <InputBarUI />
  </main>
{:else}
  <div class="loading">
    <p>⏳ Initializing AtomicAether...</p>
  </div>
{/if}

<style>
  :global(body) {
    background: var(--app-background, #222831) !important;
    color: var(--text-color, #e0e0e0) !important;
    transition: all 0.3s ease;
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  nav {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1000;
  }
  
  nav a {
    text-decoration: none;
    color: var(--accent-color, #007acc);
    background: rgba(0, 0, 0, 0.7);
    padding: 8px 16px;
    border-radius: 4px;
    backdrop-filter: blur(10px);
  }
  
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  
  .loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2em;
    color: var(--primary-color, #DFD0B8);
  }
  
</style>