<script lang="ts">
  import { onMount } from 'svelte';
  import { eventBus } from '$lib/buses';
  import type { DeletedMessage } from '$lib/bricks/RecycleBinBrick';
  import MarkdownRenderer from '$lib/bricks/MessageScrollback/core/MarkdownRenderer.svelte';
  
  // Props - expose scrollContainer for parent access
  interface Props {
    scrollContainer?: HTMLDivElement;
  }
  
  let { scrollContainer = $bindable() }: Props = $props();
  
  // State - matching MessageScrollback exactly
  let deletedMessages = $state<DeletedMessage[]>([]);
  let hoveredTurnId = $state<string | null>(null);
  let isLoadingHistory = $state(true);
  
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
  <div class="messages-area">
    {#each deletedMessages as message}
      <div 
        class="message-turn"
        onmouseenter={() => hoveredTurnId = message.turnId}
        onmouseleave={() => hoveredTurnId = null}
      >
        <!-- Show deletion timestamp subtly -->
        <div class="deletion-timestamp">
          Deleted: {formatTimestamp(message.timestamp)}
        </div>
        
        {#if message.userMessage}
          <div class="message">
            <div class="message-header">
              <span class="role-label role-label-boss">Boss</span>
            </div>
            <div class="message-content">
              <MarkdownRenderer content={message.userMessage} speaker="boss" />
            </div>
          </div>
        {/if}
        
        {#if message.assistantMessage}
          <div class="message samara-message position-relative">
            <div class="message-header">
              <span class="role-label role-label-samara">{getPersonaName(message.persona)}</span>
            </div>
            <div class="message-content">
              <MarkdownRenderer content={message.assistantMessage} speaker="samara" />
            </div>
            
            <!-- Professional action icons -->
            {#if hoveredTurnId === message.turnId}
              <div class="action-icons-group">
                <button 
                  class="icon-button"
                  onclick={() => handleRestore(message.turnId)}
                  aria-label="Restore message"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
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
  @import '$lib/../styles/shared.css';
  
  /* Only unique styles for recycle bin */
  .deletion-timestamp {
    font-size: var(--typography-font-size-tiny);
    color: rgba(255, 255, 255, 0.2);
    margin-bottom: var(--spacing-medium);
    margin-left: var(--scrollback-message-content-margin-left);
  }
  
  .message {
    margin-bottom: var(--scrollback-messages-gap);
  }
  
  .message-header {
    margin-bottom: 10px;
  }
  
  .samara-message {
    margin-bottom: var(--scrollback-messages-gap);
  }
</style>