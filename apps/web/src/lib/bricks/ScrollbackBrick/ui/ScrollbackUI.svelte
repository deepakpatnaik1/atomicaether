<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ScrollbackBrick } from '../core/ScrollbackBrick';
  import type { Message } from '../models/ScrollbackModels';
  
  // Props
  interface Props {
    brick: ScrollbackBrick;
  }
  
  let { brick }: Props = $props();
  
  // State from brick
  let messages = $state<Message[]>([]);
  let theme = $state<any>(null);
  let config = $state<any>(null);
  let service = $state<any>(null);
  
  let scrollContainer: HTMLDivElement;
  let isUserScrolling = false;
  let scrollTimeout: NodeJS.Timeout;
  
  // Update state from brick - subscribe to changes
  $effect(() => {
    if (brick) {
      const updateFromBrick = () => {
        const state = brick.getState();
        messages = state.messages;
        theme = brick.getTheme();
        config = brick.getConfig();
        service = brick.getService();
      };
      
      // Initial update
      updateFromBrick();
      
      // Subscribe to state changes
      const unsubscribe = brick.subscribeToState(updateFromBrick);
      
      return unsubscribe;
    }
  });
  
  // Handle scrolling
  function handleScroll() {
    if (!scrollContainer) return;
    
    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    
    // Debounce scroll events
    isUserScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
    }, 150);
    
    brick.handleScroll(scrollTop, isAtBottom);
  }
  
  // Auto-scroll to bottom when needed
  $effect(() => {
    if (brick && scrollContainer && !isUserScrolling) {
      const state = brick.getState();
      if (state.isAtBottom && messages.length > 0) {
        // Use smooth scrolling for better UX
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  });
  
  // Handle message click
  function handleMessageClick(message: Message) {
    brick.handleMessageClick(message.id);
  }
  
  // Handle message copy
  function handleMessageCopy(message: Message) {
    brick.handleMessageCopy(message.id);
  }
  
  // Format content using service
  function formatContent(content: string): string {
    if (!service || !theme) return content;
    
    const textColor = theme?.scrollback?.message?.textColor || '#DFD0B8';
    const boldWeight = theme?.scrollback?.message?.boldWeight || '600';
    const bulletColor = theme?.scrollback?.roleLabel?.assistant?.textColor || '#f97316';
    
    return service.formatContent(content, textColor, boldWeight, bulletColor);
  }
  
  // Get role label based on metadata
  function getRoleLabel(message: Message): string {
    if (message.role === 'user') {
      return message.metadata?.persona || 'User';
    }
    return 'Assistant';
  }
  
  onDestroy(() => {
    clearTimeout(scrollTimeout);
  });
</script>

<div 
  class="scrollback-container" 
  bind:this={scrollContainer}
  onscroll={handleScroll}
  style="
    height: {theme?.scrollback?.layout?.container?.height || 'calc(100vh - 114px)'};
    font-family: {theme?.scrollback?.typography?.fontFamily || "'Lexend', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif"};
    font-size: {theme?.scrollback?.typography?.fontSize || '13px'};
    line-height: {theme?.scrollback?.typography?.lineHeight || '1.5'};
  "
>
  <div 
    class="messages"
    style="
      --default-width: {theme?.scrollback?.layout?.container?.defaultWidth || '650px'};
      --large-width: {theme?.scrollback?.layout?.container?.largeWidth || '800px'};
      --breakpoint: {theme?.scrollback?.layout?.container?.breakpoint || '705px'};
      max-width: {theme?.scrollback?.layout?.container?.maxWidth || 'calc(100vw - 40px)'};
      padding: {theme?.scrollback?.layout?.messages?.paddingTop || '20px'} 0 {theme?.scrollback?.layout?.messages?.paddingBottom || '20px'} 0;
      padding-right: {theme?.scrollback?.layout?.messages?.paddingRight || '16px'};
    "
  >
    {#each messages as message (message.id)}
      <div 
        class="message {message.role}"
        style="
          margin-bottom: {theme?.scrollback?.layout?.message?.marginBottom || '32px'};
          padding-right: {theme?.scrollback?.layout?.message?.paddingRight || '3px'};
        "
        onclick={() => handleMessageClick(message)}
      >
        <div 
          class="message-header"
          style="margin-bottom: {theme?.scrollback?.layout?.messageHeader?.marginBottom || '10px'};"
        >
          <span 
            class="role-label"
            style="
              color: {message.role === 'user' 
                ? theme?.scrollback?.roleLabel?.user?.textColor || '#ef4444'
                : theme?.scrollback?.roleLabel?.assistant?.textColor || '#f97316'};
              background: {message.role === 'user'
                ? theme?.scrollback?.roleLabel?.user?.background || 'rgba(239, 68, 68, 0.2)'
                : theme?.scrollback?.roleLabel?.assistant?.background || 'rgba(249, 115, 22, 0.2)'};
              border-color: {message.role === 'user'
                ? theme?.scrollback?.roleLabel?.user?.borderColor || 'rgba(239, 68, 68, 0.3)'
                : theme?.scrollback?.roleLabel?.assistant?.borderColor || 'rgba(249, 115, 22, 0.3)'};
              font-size: {theme?.scrollback?.roleLabel?.fontSize || '11px'};
              font-weight: {theme?.scrollback?.roleLabel?.fontWeight || '600'};
              text-transform: {theme?.scrollback?.roleLabel?.textTransform || 'uppercase'};
              letter-spacing: {theme?.scrollback?.roleLabel?.letterSpacing || '0.5px'};
              border-radius: {theme?.scrollback?.roleLabel?.borderRadius || '4px'};
              padding: {theme?.scrollback?.layout?.roleLabel?.padding || '2px 8px'};
            "
          >{getRoleLabel(message)}</span>
          {#if config?.showTimestamps && service}
            <span class="timestamp">{service.formatTimestamp(message.timestamp)}</span>
          {/if}
        </div>
        <div 
          class="message-content"
          style="
            color: {theme?.scrollback?.message?.textColor || '#DFD0B8'};
            margin-left: {theme?.scrollback?.layout?.messageContent?.marginLeft || '19px'};
          "
        >
          {#if message.metadata?.streaming}
            {@html formatContent(message.content)}<span class="streaming-cursor">▊</span>
          {:else}
            {@html formatContent(message.content)}
          {/if}
        </div>
        {#if config?.showMetadata && message.metadata}
          <div class="message-metadata">
            {#if message.metadata.model}
              <span class="metadata-item">Model: {message.metadata.model}</span>
            {/if}
            {#if message.metadata.edited}
              <span class="metadata-item">Edited</span>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty-state">
        <p>No messages yet. Start a conversation!</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .scrollback-container {
    display: flex;
    flex-direction: column;
    /* Height and typography now come from inline styles via theme */
    align-items: center;
    overflow-y: auto;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    /* Width and padding now come from inline styles and CSS variables */
    width: var(--default-width);
    box-sizing: border-box;
  }

  @media (min-width: 705px) {
    .messages {
      width: var(--large-width) !important;
    }
  }

  .message {
    /* Margin and padding now come from inline styles via theme */
    padding: 0;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }
  
  .message:hover {
    opacity: 0.9;
  }

  .message-header {
    /* Margin now comes from inline styles via theme */
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .role-label {
    display: inline-block;
    /* All styling now comes from inline styles via theme */
    border-width: 1px;
    border-style: solid;
  }
  
  .timestamp {
    font-size: 10px;
    opacity: 0.5;
  }

  .message-content {
    /* All styling now comes from inline styles via theme */
    padding-left: 0;
  }

  .message-content :global(.message-paragraph) {
    /* Margin now comes from inline styles via theme */
  }

  .message-content :global(.message-paragraph:last-child) {
    margin-bottom: 0 !important;
  }

  .message-content :global(strong) {
    /* Color and font-weight now come from inline styles via theme */
  }

  .message-content :global(em) {
    font-style: italic;
    /* Color now comes from inline styles via theme */
  }

  .message-content :global(.bullet-item) {
    display: flex;
    margin: 0;
    /* Padding now comes from inline styles via theme */
  }

  .message-content :global(.bullet) {
    /* All styling now comes from inline styles via theme */
    font-weight: bold;
    flex-shrink: 0;
  }

  .message-content :global(.bullet-content) {
    flex: 1;
    display: inline-block;
  }
  
  .streaming-cursor {
    animation: blink 1s infinite;
    opacity: 0.7;
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  .message-metadata {
    margin-top: 4px;
    margin-left: 19px;
    display: flex;
    gap: 12px;
  }
  
  .metadata-item {
    font-size: 10px;
    opacity: 0.5;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px;
    opacity: 0.5;
  }

  /* Hide scrollbar */
  .messages::-webkit-scrollbar {
    display: none;
  }
  
  .messages {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
</style>