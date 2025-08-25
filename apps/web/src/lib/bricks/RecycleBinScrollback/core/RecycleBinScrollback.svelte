<script lang="ts">
  import { onMount } from 'svelte';
  import { eventBus } from '$lib/buses';
  import type { DeletedMessage } from '$lib/bricks/RecycleBinBrick';
  import MarkdownRenderer from '$lib/bricks/MessageScrollback/core/MarkdownRenderer.svelte';
  
  // State - matching MessageScrollback exactly
  let deletedMessages = $state<DeletedMessage[]>([]);
  let hoveredTurnId = $state<string | null>(null);
  let isLoadingHistory = $state(true);
  
  // Refs
  let scrollContainer: HTMLDivElement;
  
  onMount(() => {
    console.log('📜 RecycleBinScrollback: Initializing');
    
    // Listen for recycle bin data
    eventBus.subscribe('recyclebin:data', (data: any) => {
      deletedMessages = data.messages || [];
      isLoadingHistory = false;
      console.log(`📜 RecycleBinScrollback: Received ${deletedMessages.length} deleted messages`);
    });
    
    // Request initial data
    eventBus.publish('recyclebin:request', {});
  });
  
  // Handle restore action
  function handleRestore(turnId: string) {
    console.log('♻️ Restoring message:', turnId);
    eventBus.publish('message:restore', { turnId });
    
    // Show feedback
    eventBus.publish('notification:show', {
      message: 'Message restored',
      type: 'success',
      duration: 2000
    });
  }
  
  // Format timestamp - show actual date/time
  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleString('en-US', options);
  }
  
  // Get persona name (default to Samara if not specified)
  function getPersonaName(persona?: string): string {
    if (!persona) return 'Samara';
    // Capitalize first letter
    return persona.charAt(0).toUpperCase() + persona.slice(1);
  }
</script>

<div class="scrollback-container" bind:this={scrollContainer}>
  <div class="messages">
    {#each deletedMessages as message}
      <div 
        class="message-turn"
        onmouseenter={() => hoveredTurnId = message.turnId}
        onmouseleave={() => hoveredTurnId = null}
      >
        <!-- Show deletion timestamp subtly -->
        <div style="font-size: 10px; color: rgba(255, 255, 255, 0.2); margin-bottom: 16px; margin-left: 19px;">
          Deleted: {formatTimestamp(message.timestamp)}
        </div>
        
        {#if message.userMessage}
          <div class="message">
            <div class="message-header">
              <span class="role-label boss">Boss</span>
            </div>
            <div class="message-content">
              <MarkdownRenderer content={message.userMessage} speaker="boss" />
            </div>
          </div>
        {/if}
        
        {#if message.assistantMessage}
          <div class="message samara-message">
            <div class="message-header">
              <span class="role-label samara">{getPersonaName(message.persona)}</span>
            </div>
            <div class="message-content">
              <MarkdownRenderer content={message.assistantMessage} speaker="samara" />
            </div>
            
            <!-- Professional action icons -->
            {#if hoveredTurnId === message.turnId}
              <div class="action-icons">
                <button 
                  class="action-icon"
                  onclick={() => handleRestore(message.turnId)}
                  aria-label="Restore message"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 7h7c2.2 0 4 1.8 4 4s-1.8 4-4 4H7"/>
                    <polyline points="6 4 3 7 6 10"/>
                  </svg>
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
    
    {#if isLoadingHistory}
      <div class="loading-state">
        Loading deleted messages...
      </div>
    {:else if deletedMessages.length === 0}
      <div class="empty-state">
        No deleted messages
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
    padding-left: 0;
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
  
  /* Message turn container */
  .message-turn {
    position: relative;
  }
  
  /* Samara message - needed for positioning icons */
  .samara-message {
    position: relative;
  }
  
  /* Professional action icons container */
  .action-icons {
    position: absolute;
    bottom: 0;
    right: 0;
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    animation: fadeIn 0.2s ease-out;
    transform: translateY(4px);
  }
  
  /* Individual action buttons */
  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
  }
  
  .action-icon:hover {
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }
  
  .action-icon:active {
    transform: scale(0.95);
  }
  
  /* Icon SVGs */
  .action-icon svg {
    width: 16px;
    height: 16px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  
  /* Fade in animation */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(4px);
    }
  }
  
  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 80px 20px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 14px;
  }
  
  /* Loading state */
  .loading-state {
    text-align: center;
    padding: 80px 20px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
  }
</style>