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
    onclick={toggleDropdown}
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
            onclick={() => selectTheme(theme)}
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
            onclick={clearSelection}
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
  /* Use dropdown theme from rainy-night.json */
  .theme-picker {
    position: relative;
    display: inline-block;
    font-family: var(--typography-font-family-system);
  }

  /* Trigger button - reuse controlsRow.dropdownTrigger styling */
  .picker-trigger {
    display: flex;
    align-items: center;
    gap: var(--spacing-tiny);
    padding: var(--spacing-small) var(--spacing-compact);
    background: var(--app-background);
    border: var(--borders-style-subtle);
    border-radius: var(--borders-radius-medium);
    font-size: var(--typography-font-size-medium);
    color: var(--controls-row-dropdown-trigger-color);
    cursor: pointer;
    min-width: 120px;
    justify-content: space-between;
  }

  .picker-trigger:hover:not(:disabled) {
    background: var(--controls-row-dropdown-trigger-background-hover);
  }

  .picker-trigger:focus {
    outline: 2px solid var(--navigation-link-color);
    outline-offset: 2px;
  }

  .picker-trigger:disabled {
    opacity: var(--effects-opacity-muted);
    cursor: not-allowed;
  }

  .compact .picker-trigger {
    padding: var(--spacing-tiny) var(--spacing-small);
    font-size: var(--typography-font-size-base);
    min-width: 100px;
  }

  .theme-icon {
    font-size: var(--typography-font-size-large);
  }

  .theme-name {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-arrow {
    font-size: var(--typography-font-size-tiny);
    color: var(--controls-row-dropdown-trigger-chevron-color);
  }

  .dropdown-arrow.rotated {
  }

  /* Dropdown menu - use dropdown.menu styling */
  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--dropdown-menu-background);
    backdrop-filter: var(--dropdown-menu-backdrop-filter);
    -webkit-backdrop-filter: var(--dropdown-menu-backdrop-filter);
    border: var(--dropdown-menu-border);
    border-radius: var(--dropdown-menu-border-radius);
    box-shadow: var(--dropdown-menu-shadow);
    z-index: 1000;
    margin-top: var(--spacing-micro);
    max-height: 200px;
    overflow-y: auto;
  }

  /* Theme options - use dropdown.item styling */
  .theme-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--spacing-small) var(--spacing-compact);
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: var(--typography-font-size-medium);
    color: var(--dropdown-item-color);
    justify-content: space-between;
  }

  .theme-option:hover {
    background: var(--dropdown-item-background-hover);
  }

  .theme-option:focus {
    background: var(--dropdown-item-background-hover);
    outline: none;
  }

  .theme-option.selected {
    background: var(--dropdown-item-background-selected);
    color: var(--dropdown-item-color-selected);
  }

  .clear-option {
    opacity: var(--effects-opacity-subtle);
    font-style: italic;
  }

  .selected-indicator {
    color: var(--dropdown-item-color-selected);
    font-weight: var(--typography-font-weight-bold);
  }

  /* Section separator - use dropdown.sectionHeader */
  .separator {
    height: 1px;
    background: var(--dropdown-section-header-border-bottom);
    margin: var(--spacing-micro) 0;
  }

  .no-themes {
    padding: var(--spacing-compact);
    text-align: center;
    color: var(--dropdown-item-color);
    opacity: var(--effects-opacity-muted);
    font-style: italic;
  }

  /* Hide scrollbar for cleaner look */
  .dropdown-menu::-webkit-scrollbar {
    display: none;
  }
  
  .dropdown-menu {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>