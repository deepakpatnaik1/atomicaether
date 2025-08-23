<script lang="ts">
  import { onMount } from 'svelte';
  import { stateBus } from '$lib/buses';
  import type { MessageTurnState } from './types';
  
  // State
  let messageTurnState = $state<MessageTurnState | undefined>(undefined);
  let visibleTurns = $derived(messageTurnState?.turns || []);
  
  // Reactive trigger for polling
  let updateTrigger = $state(0);
  
  // Refs
  let scrollContainer: HTMLDivElement;
  
  // Config
  const scrollbackConfig = {
    autoScroll: true
  };
  
  // Poll StateBus for updates
  $effect(() => {
    updateTrigger; // Access trigger to create dependency
    const state = stateBus.get('messageTurn') as MessageTurnState | undefined;
    messageTurnState = state;
  });
  
  // Auto-scroll effect - scrolls to bottom whenever content updates
  $effect(() => {
    updateTrigger; // Trigger on every poll (every 100ms)
    
    // Auto-scroll to bottom to keep streaming messages visible
    if (scrollContainer && scrollbackConfig.autoScroll && visibleTurns.length > 0) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
  
  // Set up polling interval
  onMount(() => {
    const interval = setInterval(() => {
      updateTrigger++;
    }, 100); // Poll every 100ms
    
    return () => clearInterval(interval);
  });
</script>

<div class="scrollback-container" bind:this={scrollContainer}>
  <div class="messages">
    {#each visibleTurns as turn}
      <div class="message-turn">
        {#if turn.bossMessage}
          <div class="message">
            <div class="message-header">
              <span class="role-label boss">Boss</span>
            </div>
            <div class="message-content">
              {turn.bossMessage.content}
            </div>
          </div>
        {/if}
        
        {#if turn.samaraMessage}
          <div class="message">
            <div class="message-header">
              <span class="role-label samara">Samara</span>
            </div>
            <div class="message-content">
              {turn.samaraMessage.content}
            </div>
          </div>
        {/if}
      </div>
    {/each}
    
    {#if visibleTurns.length === 0}
      <div class="empty-state">
        No messages yet. Start a conversation!
      </div>
    {/if}
  </div>
</div>

<style>
  /* Container - from rainy-night.json scrollback.layout.container */
  .scrollback-container {
    height: calc(100vh - 114px);
    width: 650px;
    max-width: calc(100vw - 40px);
    margin: 0 auto;
    overflow-y: auto;
    overflow-x: hidden;
    background: transparent;
  }
  
  @media (min-width: 705px) {
    .scrollback-container {
      width: 800px;
    }
  }
  
  /* Messages area - from scrollback.layout.messages */
  .messages {
    padding-top: 20px;
    padding-bottom: 20px;
    padding-right: 16px;
    padding-left: 20px;
  }
  
  /* Individual message - from scrollback.layout.message */
  .message {
    margin-bottom: 32px;
    padding-right: 3px;
  }
  
  /* Message header - from scrollback.layout.messageHeader */
  .message-header {
    margin-bottom: 10px;
  }
  
  /* Message content - from scrollback.layout.messageContent & scrollback.typography */
  .message-content {
    margin-left: 19px;
    color: #DFD0B8;
    font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  /* Role labels - from scrollback.roleLabel */
  .role-label {
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-radius: 4px;
    display: inline-block;
    border: 1px solid;
  }
  
  /* Boss label - from scrollback.roleLabel.user */
  .role-label.boss {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
  }
  
  /* Samara label - from scrollback.roleLabel.assistant */
  .role-label.samara {
    color: #f97316;
    background: rgba(249, 115, 22, 0.2);
    border-color: rgba(249, 115, 22, 0.3);
  }
  
  /* Empty state */
  .empty-state {
    text-align: center;
    opacity: 0.5;
    padding: 2rem;
    color: #DFD0B8;
    font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
  }
  
  /* Hide scrollbar */
  .scrollback-container::-webkit-scrollbar {
    display: none;
  }
  
  .scrollback-container {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
</style>