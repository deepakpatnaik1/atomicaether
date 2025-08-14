<!-- demo-meta:
{
  "name": "test-brick",
  "series": "000s",
  "category": "uncategorized",
  "description": "Interactive demo for test-brick",
  "tags": ["demo"],
  "status": "wip"
}
-->

<script lang="ts">
  import { onMount } from 'svelte';
  
  // Feature states
  let loading = false;
  let error = '';
  let result: any = null;
  let initialized = false;
  
  onMount(async () => {
    try {
      // TODO: Initialize the feature here
      initialized = true;
      console.log('[Demo] Test Brick initialized');
    } catch (e) {
      error = `Failed to initialize: ${e}`;
    }
  });
  
  // Actions
  async function testMethod1() {
    loading = true;
    error = '';
    try {
      // TODO: Implement test for method 1
      result = { test: 'Method 1 result', timestamp: Date.now() };
      console.log('[Demo] Method 1 executed', result);
    } catch (e) {
      error = `Method 1 failed: ${e}`;
    } finally {
      loading = false;
    }
  }
  
  async function testMethod2() {
    loading = true;
    error = '';
    try {
      // TODO: Implement test for method 2
      result = { test: 'Method 2 result', timestamp: Date.now() };
      console.log('[Demo] Method 2 executed', result);
    } catch (e) {
      error = `Method 2 failed: ${e}`;
    } finally {
      loading = false;
    }
  }
  
  function reset() {
    loading = false;
    error = '';
    result = null;
    console.log('[Demo] Reset to initial state');
  }
  
  // State display
  $: stateDisplay = {
    initialized,
    loading,
    error: error || null,
    result
  };
</script>

<div class="demo-container">
  <h1>Test Brick Demo</h1>
  
  <!-- Actions Section -->
  <section class="demo-section">
    <h2>Actions</h2>
    <div>
      <button 
        class="demo-button"
        on:click={testMethod1}
        disabled={loading}
      >
        Test Method 1
      </button>
      <button 
        class="demo-button"
        on:click={testMethod2}
        disabled={loading}
      >
        Test Method 2
      </button>
    </div>
  </section>
  
  <!-- State Section -->
  <section class="demo-section">
    <h2>Current State</h2>
    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
      <span class="status-indicator {initialized ? 'active' : 'inactive'}"></span>
      <span>Initialized: {initialized}</span>
    </div>
    <pre>{JSON.stringify(stateDisplay, null, 2)}</pre>
  </section>
  
  <!-- Output Section -->
  <section class="demo-section">
    <h2>Output</h2>
    {#if loading}
      <p>Loading...</p>
    {/if}
    {#if error}
      <div class="error">{error}</div>
    {/if}
    {#if result}
      <pre>{JSON.stringify(result, null, 2)}</pre>
    {/if}
    {#if !loading && !error && !result}
      <p style="color: #6b7280;">No output yet. Try clicking an action button above.</p>
    {/if}
  </section>
  
  <!-- Debug Section -->
  <section class="demo-section">
    <h2>Debug Info</h2>
    <p>📝 Check browser console for detailed logs</p>
    <p>🔍 Feature available at <code>window.__testBrick</code> (DEV mode)</p>
    <p>📊 State updates are reactive via Svelte</p>
  </section>
  
  <!-- Reset Section -->
  <section class="demo-section">
    <button 
      class="demo-button"
      on:click={reset}
      style="background: #ef4444;"
    >
      Reset Demo
    </button>
  </section>
</div>

<style>
  .demo-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .demo-section {
    background: #f9fafb;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .demo-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1f2937;
  }
  
  .demo-button {
    padding: 0.5rem 1rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .demo-button:hover {
    background: #4f46e5;
  }
  
  .demo-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .error {
    color: #ef4444;
    padding: 1rem;
    background: #fee2e2;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  
  pre {
    background: #1f2937;
    color: #f3f4f6;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.5;
  }
  
  .status-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 0.5rem;
  }
  
  .status-indicator.active {
    background: #10b981;
  }
  
  .status-indicator.inactive {
    background: #ef4444;
  }
</style>