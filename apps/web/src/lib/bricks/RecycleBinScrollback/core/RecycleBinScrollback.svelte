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
  
  // BOSS REQUIREMENT: Handle restore action (return message to scrollback)
  function handleRestore(turnId: string) {
    console.log(`♻️ RecycleBinScrollback: Restoring message ${turnId}`);
    eventBus.publish('message:restore', { turnId });
    
    // Show user feedback
    eventBus.publish('notification:show', {
      message: 'Message restored to chat',
      type: 'success',
      duration: 2000
    });
  }
  
  // BOSS REQUIREMENT: Handle hard-delete action (permanent removal)
  function handleHardDelete(turnId: string) {
    console.log(`🔥 RecycleBinScrollback: Hard-deleting message ${turnId}`);
    
    // Confirm with user since this is permanent
    const confirmed = confirm('Are you sure you want to permanently delete this message? This action cannot be undone.');
    
    if (confirmed) {
      // Publish hard-delete event for RecycleBinBrick to handle
      eventBus.publish('message:hard-delete', { turnId });
      
      // Show user feedback
      eventBus.publish('notification:show', {
        message: 'Message permanently deleted',
        type: 'warning',
        duration: 3000
      });
    }
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
        <!-- Show conversation context subtly -->
        <div class="conversation-timestamp">
          From conversation: {formatTimestamp(message.timestamp)}
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
            
            <!-- BOSS REQUIREMENT: Two icons per message pair - restore and hard delete -->
            {#if hoveredTurnId === message.turnId}
              <div class="action-icons-group">
                <button 
                  class="icon-button"
                  onclick={() => handleRestore(message.turnId)}
                  aria-label="Restore message to chat"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 7h7c2.2 0 4 1.8 4 4s-1.8 4-4 4H7"/>
                    <polyline points="6 4 3 7 6 10"/>
                  </svg>
                </button>
                <button 
                  class="icon-button icon-button-danger"
                  onclick={() => handleHardDelete(message.turnId)}
                  aria-label="Permanently delete message"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M5.5 2.5V1.5C5.5 1.22386 5.72386 1 6 1H10C10.2761 1 10.5 1.22386 10.5 1.5V2.5M2 4H14M3 4V13.5C3 14.0523 3.44772 14.5 4 14.5H12C12.5523 14.5 13 14.0523 13 13.5V4M6.5 7V11.5M9.5 7V11.5"/>
                    <!-- Add X overlay to indicate permanent deletion -->
                    <path d="M5 5l6 6M11 5l-6 6" stroke-width="2" opacity="0.7"/>
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
  .conversation-timestamp {
    font-size: var(--typography-font-size-tiny);
    color: rgba(255, 255, 255, 0.4);
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
  
  /* BOSS REQUIREMENT: Danger styling for hard-delete button */
  .icon-button-danger {
    color: #ff6b6b;
  }
  
  .icon-button-danger:hover {
    color: #ff4757;
    background: rgba(255, 107, 107, 0.1);
  }
</style>