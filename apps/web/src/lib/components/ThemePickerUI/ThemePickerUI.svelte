<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { themeSelector } from '$lib/buses';
  
  const { disabled = false, compact = true, placeholder = 'Theme' } = $props();
  
  const dispatch = createEventDispatcher();
  
  let isOpen = $state(false);
  let themes: string[] = $state([]);
  let currentTheme: string | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);
  let dropdownRef: HTMLDivElement;

  onMount(async () => {
    try {
      // Get available themes
      themes = await themeSelector.getAvailableThemes();
      
      // Get current selection
      currentTheme = themeSelector.getCurrentTheme();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error('ThemePickerUI error:', err);
    } finally {
      loading = false;
    }
  });

  function toggleDropdown() {
    if (disabled || loading) {
      return;
    }
    
    isOpen = !isOpen;
    dispatch('dropdownToggled', { open: isOpen });
    
    if (isOpen) {
      // Focus first theme option when opened
      setTimeout(() => {
        const firstOption = dropdownRef?.querySelector('button');
        firstOption?.focus();
      }, 0);
    }
  }

  async function selectTheme(theme: string) {
    try {
      await themeSelector.selectTheme(theme);
      currentTheme = theme;
      isOpen = false;
      
      dispatch('themeSelected', { theme });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error('ThemePickerUI: Theme selection error:', err);
    }
  }

  function clearSelection() {
    themeSelector.clearSelection();
    currentTheme = null;
    isOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  // Close dropdown when clicking outside
  $effect(() => {
    if (typeof window !== 'undefined') {
      if (isOpen) {
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleKeydown);
        
        return () => {
          document.removeEventListener('click', handleClickOutside);
          document.removeEventListener('keydown', handleKeydown);
        };
      }
    }
  });
</script>

<div 
  class="theme-picker" 
  class:compact 
  class:disabled 
  class:open={isOpen}
  bind:this={dropdownRef}
>
  <button 
    class="picker-trigger"
    on:click={toggleDropdown}
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-label="Select theme"
  >
    <span class="theme-icon">🎨</span>
    <span class="theme-name">
      {#if loading}
        Loading...
      {:else if error}
        Error
      {:else}
        {currentTheme ?? placeholder}
      {/if}
    </span>
    <span class="dropdown-arrow" class:rotated={isOpen}>▼</span>
  </button>
  
  {#if isOpen && !loading}
    <div class="dropdown-menu" role="listbox">
      {console.log('Template render - themes.length:', themes.length, 'isOpen:', isOpen, 'loading:', loading)}
      {#if themes.length === 0}
        <div class="no-themes">No themes available</div>
      {:else}
        {#each themes as theme}
          <button 
            class="theme-option"
            class:selected={currentTheme === theme}
            on:click={() => selectTheme(theme)}
            role="option"
            aria-selected={currentTheme === theme}
          >
            <span class="theme-name">{theme}</span>
            {#if currentTheme === theme}
              <span class="selected-indicator">✓</span>
            {/if}
          </button>
        {/each}
        
        {#if currentTheme}
          <div class="separator"></div>
          <button 
            class="theme-option clear-option"
            on:click={clearSelection}
            role="option"
            aria-selected="false"
          >
            <span class="theme-name">Clear Selection</span>
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .theme-picker {
    position: relative;
    display: inline-block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .picker-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--surface-background, #f8f9fa);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    font-size: 14px;
    color: var(--text-color, #333);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 120px;
    justify-content: space-between;
  }

  .picker-trigger:hover:not(:disabled) {
    background: var(--surface-hover, #f0f1f2);
    border-color: var(--border-hover, #c0c0c0);
  }

  .picker-trigger:focus {
    outline: 2px solid var(--accent-color, #007acc);
    outline-offset: 2px;
  }

  .picker-trigger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .compact .picker-trigger {
    padding: 6px 10px;
    font-size: 13px;
    min-width: 100px;
  }

  .theme-icon {
    font-size: 16px;
  }

  .theme-name {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-arrow {
    font-size: 10px;
    transition: transform 0.2s ease;
    color: var(--text-secondary, #666);
  }

  .dropdown-arrow.rotated {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--surface-background, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    margin-top: 4px;
    max-height: 200px;
    overflow-y: auto;
  }

  .theme-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease;
    font-size: 14px;
    color: white;
    justify-content: space-between;
  }

  .theme-option:hover {
    background: var(--surface-hover, #f5f5f5);
  }

  .theme-option:focus {
    background: var(--surface-hover, #f5f5f5);
    outline: none;
  }

  .theme-option.selected {
    background: var(--accent-light, #e6f3ff);
    color: var(--accent-color, #007acc);
  }

  .clear-option {
    color: var(--text-secondary, #666);
    font-style: italic;
  }

  .selected-indicator {
    color: var(--accent-color, #007acc);
    font-weight: bold;
  }

  .separator {
    height: 1px;
    background: var(--border-color, #e0e0e0);
    margin: 4px 0;
  }

  .no-themes {
    padding: 12px;
    text-align: center;
    color: var(--text-secondary, #666);
    font-style: italic;
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .picker-trigger {
      background: var(--surface-background, #2d2d2d);
      border-color: var(--border-color, #555);
      color: var(--text-color, #e0e0e0);
    }

    .dropdown-menu {
      background: var(--surface-background, #2d2d2d);
      border-color: var(--border-color, #555);
    }
  }
</style>