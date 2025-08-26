<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let status = 'ready';
  let clearedItems = [];
  let currentKeys = [];
  
  onMount(() => {
    if (browser) {
      // Safely get localStorage keys only in browser
      currentKeys = Object.keys(localStorage).filter(k => 
        k.includes('recycle') || 
        k.includes('atomicaether') || 
        k.includes('message')
      );
    }
  });
  
  function clearRecycleBin() {
    if (!browser) return;
    status = 'clearing';
    clearedItems = [];
    
    try {
      // Show what's currently in localStorage first
      console.log('Current localStorage keys:', Object.keys(localStorage));
      
      // Clear legacy RecycleBin localStorage
      const legacyKey = 'atomicaether:recycle-bin';
      const legacyData = localStorage.getItem(legacyKey);
      if (legacyData) {
        try {
          const parsed = JSON.parse(legacyData);
          clearedItems.push(`${legacyKey}: ${Array.isArray(parsed) ? parsed.length : 'unknown'} items`);
        } catch (e) {
          clearedItems.push(`${legacyKey}: parsing error, cleared anyway`);
        }
        localStorage.removeItem(legacyKey);
      } else {
        clearedItems.push(`${legacyKey}: not found`);
      }
      
      // Clear MessagePairSet RecycleBin localStorage
      const pairSetKey = 'atomicaether:recycle-bin-pairsets';
      const pairSetData = localStorage.getItem(pairSetKey);
      if (pairSetData) {
        try {
          const parsed = JSON.parse(pairSetData);
          clearedItems.push(`${pairSetKey}: ${Array.isArray(parsed) ? parsed.length : 'unknown'} items`);
        } catch (e) {
          clearedItems.push(`${pairSetKey}: parsing error, cleared anyway`);
        }
        localStorage.removeItem(pairSetKey);
      } else {
        clearedItems.push(`${pairSetKey}: not found`);
      }
      
      // Clear ALL localStorage keys that might be related
      const allKeys = Object.keys(localStorage);
      const relevantKeys = allKeys.filter(key => 
        key.includes('recycle') || 
        key.includes('trash') || 
        key.includes('deleted') ||
        key.includes('message') ||
        key.includes('journal') ||
        key.includes('atomicaether')
      );
      
      relevantKeys.forEach(key => {
        if (key !== legacyKey && key !== pairSetKey) {
          const data = localStorage.getItem(key);
          clearedItems.push(`${key}: ${data ? 'cleared' : 'empty'}`);
          localStorage.removeItem(key);
        }
      });
      
      // Force clear common cache keys
      const forceClearKeys = [
        'atomicaether:messages',
        'atomicaether:cache',
        'atomicaether:deleted-messages',
        'superjournal:cache',
        'messages:cache'
      ];
      
      forceClearKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          clearedItems.push(`${key}: force cleared`);
          localStorage.removeItem(key);
        }
      });
      
      status = 'success';
      
      // Also dispatch a custom event to force RecycleBin refresh
      window.dispatchEvent(new CustomEvent('recyclebin:force-refresh'));
      
      // Force immediate refresh of RecycleBin components
      setTimeout(() => {
        window.location.href = '/recyclebin';
      }, 2000);
      
    } catch (error) {
      console.error('Error clearing RecycleBin:', error);
      status = 'error';
    }
  }
</script>

<main class="clear-recyclebin">
  <h1>🧹 Clear RecycleBin LocalStorage</h1>
  
  {#if status === 'ready' && browser}
    <div class="debug-info">
      <h3>🔍 Debug Info</h3>
      <p>Current localStorage keys related to RecycleBin:</p>
      <div class="debug-keys">
        {#each currentKeys as key}
          <div class="debug-key">
            <strong>{key}:</strong> {browser ? localStorage.getItem(key)?.substring(0, 100) : 'Loading...'}...
          </div>
        {/each}
        {#if currentKeys.length === 0}
          <p>✅ No RecycleBin-related keys found in localStorage</p>
        {/if}
      </div>
    </div>
  {:else if status === 'ready'}
    <div class="debug-info">
      <p>Loading localStorage information...</p>
    </div>
  {/if}
  
  <div class="status">
    {#if status === 'ready'}
      <p>This will clear all RecycleBin data from localStorage to sync with the empty SuperJournal.</p>
      <button onclick={clearRecycleBin} class="clear-btn">
        Clear RecycleBin LocalStorage
      </button>
    {:else if status === 'clearing'}
      <p>Clearing RecycleBin localStorage...</p>
    {:else if status === 'success'}
      <p>✅ RecycleBin localStorage cleared successfully!</p>
      <p>Redirecting to home page...</p>
      
      {#if clearedItems.length > 0}
        <div class="cleared-items">
          <h3>Cleared Items:</h3>
          <ul>
            {#each clearedItems as item}
              <li>{item}</li>
            {/each}
          </ul>
        </div>
      {/if}
    {:else if status === 'error'}
      <p>❌ Error clearing RecycleBin localStorage</p>
      <button onclick={clearRecycleBin} class="clear-btn">
        Try Again
      </button>
    {/if}
  </div>
    
  <div class="console-script">
    <h3>🔧 Alternative: Browser Console Script</h3>
    <p>If the button doesn't work, copy and paste this into your browser console:</p>
    <pre><code>// Clear all RecycleBin-related localStorage
const keys = Object.keys(localStorage);
const relevantKeys = keys.filter(k => k.includes('recycle') || k.includes('atomicaether') || k.includes('message'));
console.log('Clearing keys:', relevantKeys);
relevantKeys.forEach(key => localStorage.removeItem(key));
console.log('Cleared! Refreshing page...');
window.location.reload();</code></pre>
  </div>
</main>

<style>
  .clear-recyclebin {
    padding: 2rem;
    max-width: 600px;
    margin: 0 auto;
    font-family: system-ui, sans-serif;
  }
  
  .clear-btn {
    padding: 1rem 2rem;
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .clear-btn:hover {
    background: #cc3333;
  }
  
  .status {
    margin: 2rem 0;
  }
  
  .cleared-items {
    margin-top: 1rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 4px;
  }
  
  .cleared-items ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  
  .cleared-items li {
    margin: 0.25rem 0;
    font-family: monospace;
    font-size: 0.9rem;
  }
  
  .debug-info {
    margin: 1rem 0;
    padding: 1rem;
    background: #f0f8ff;
    border-radius: 4px;
    border-left: 4px solid #0066cc;
  }
  
  .debug-key {
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: white;
    border-radius: 2px;
    font-family: monospace;
    font-size: 0.85rem;
    word-break: break-all;
  }
  
  .console-script {
    margin-top: 2rem;
    padding: 1rem;
    background: #f8f8f8;
    border-radius: 4px;
  }
  
  .console-script pre {
    background: #2d2d2d;
    color: #f8f8f2;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0.5rem 0;
  }
</style>