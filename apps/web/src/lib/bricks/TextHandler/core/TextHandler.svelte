<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { configBus } from '$lib/buses';
  import { TextHandlerService } from './TextHandlerService.js';
  import type { TextHandlerConfig, TextHandlerTheme, TextHandlerEvent } from './types.js';

  // Props using Svelte 5 runes
  interface Props {
    initialText?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
  }
  
  const { 
    initialText = '', 
    placeholder = '', 
    disabled = false, 
    readonly = false 
  }: Props = $props();

  // State
  let text = $state(initialText);
  let textarea: HTMLTextAreaElement;
  let config: TextHandlerConfig | null = $state(null);
  let theme: TextHandlerTheme | null = $state(null);
  let service: TextHandlerService | null = null;
  let effectivePlaceholder = $state(placeholder);

  // Event dispatcher
  const dispatch = createEventDispatcher<TextHandlerEvent>();

  // Reactive getters for external API
  export function getText(): string {
    return text;
  }

  export function setText(value: string): void {
    text = value;
    if (service) {
      service.autoResize();
      dispatch('textChange', { text: value });
    }
  }

  export function clearText(): void {
    text = '';
    if (service) {
      service.resetHeight();
      dispatch('textChange', { text: '' });
    }
  }

  export function autoResize(): void {
    if (service) {
      service.autoResize();
    }
  }

  export function resetHeight(): void {
    if (service) {
      service.resetHeight();
      dispatch('heightChange', { 
        height: service.getCurrentHeight(), 
        lineCount: service.getLineCount() 
      });
    }
  }

  export function getCurrentHeight(): number {
    return service?.getCurrentHeight() || 0;
  }

  export function isAtMaxHeight(): boolean {
    return service?.isAtMaxHeight() || false;
  }

  export function getLineCount(): number {
    return service?.getLineCount() || 1;
  }

  // Event handlers extracted from Sandbox 11
  function handleTextInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    text = target.value;
    
    console.log('Text input:', text, 'Service:', !!service);
    
    if (service) {
      service.autoResize();
      console.log('After resize - height:', service.getCurrentHeight());
      dispatch('textChange', { text });
      dispatch('heightChange', { 
        height: service.getCurrentHeight(), 
        lineCount: service.getLineCount() 
      });
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!config) return;

    // Escape key behavior from Sandbox 11
    if (event.key === 'Escape') {
      let clearedText = false;
      let resetHeight = false;

      if (config.keyboardShortcuts.escapeKey.clearText) {
        text = '';
        clearedText = true;
      }

      if (config.keyboardShortcuts.escapeKey.resetHeight && service) {
        service.resetHeight();
        resetHeight = true;
      }

      if (clearedText || resetHeight) {
        dispatch('escape', { clearedText, resetHeight });
        
        if (clearedText) {
          dispatch('textChange', { text });
        }
        
        if (resetHeight) {
          dispatch('heightChange', { 
            height: service?.getCurrentHeight() || 0, 
            lineCount: service?.getLineCount() || 1 
          });
        }
      }
    }
  }

  onMount(async () => {
    console.log('TextHandler mounting, textarea:', !!textarea);
    
    // Load configuration
    config = await configBus.load<TextHandlerConfig>('textHandler');
    console.log('Config loaded:', !!config);
    
    // Load theme from static directory
    try {
      const response = await fetch('/themes/rainy-night.json');
      const fullTheme = await response.json();
      theme = fullTheme?.textHandler;
      console.log('Theme loaded:', !!theme);
    } catch (error) {
      console.warn('Theme loading failed:', error);
      theme = null;
    }

    if (config) {
      // Initialize service
      service = new TextHandlerService(config);
      console.log('Service created, textarea available:', !!textarea);
      
      if (textarea) {
        service.setTextarea(textarea);
        console.log('Service textarea set');
      }
      
      // Apply theme styles
      if (theme) {
        service.applyThemeStyles({ textHandler: theme });
      }

      // Set initial placeholder if not provided
      if (!placeholder && config.textarea.placeholder) {
        effectivePlaceholder = config.textarea.placeholder;
      }
    }

    return () => {
      if (service) {
        service.destroy();
      }
    };
  });

  // Reactive updates
  $effect(() => {
    if (service && textarea) {
      service.autoResize();
    }
  });
</script>

<!-- 
BRICK-302 TextHandler Component
Extracted from Sandbox 11 text handling logic
Provides auto-resize textarea with keyboard shortcuts
-->
<textarea
  bind:this={textarea}
  bind:value={text}
  placeholder={effectivePlaceholder}
  {disabled}
  {readonly}
  rows={config?.textarea.initialRows || 1}
  style:color={theme?.textarea.color || '#DFD0B8'}
  style:font-size={theme?.textarea.fontSize || '14px'}
  style:font-family={theme?.textarea.fontFamily || 'system-ui'}
  style:line-height={theme?.textarea.lineHeight || '20px'}
  style:transition={theme?.textarea.transition || 'height 0.2s ease'}
  style:background={theme?.textarea.background || 'transparent'}
  style:border={theme?.textarea.border || 'none'}
  style:outline={theme?.textarea.outline || 'none'}
  style:resize={theme?.textarea.resize || 'none'}
  style:overflow-y={theme?.textarea.overflowY || 'hidden'}
  style:box-sizing={theme?.textarea.boxSizing || 'border-box'}
  style:height={config ? `${config.autoResize.minHeight}px` : '20px'}
  style:min-height={config ? `${config.autoResize.minHeight}px` : '20px'}
  style:max-height={config ? `${config.autoResize.maxHeight}px` : '240px'}
  on:input={handleTextInput}
  on:keydown={handleKeydown}
></textarea>

<style>
  textarea::placeholder {
    color: var(--placeholder-color, rgba(223, 208, 184, 0.6));
  }
</style>