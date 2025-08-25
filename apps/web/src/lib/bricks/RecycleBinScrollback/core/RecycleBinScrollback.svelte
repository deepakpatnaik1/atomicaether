<script lang="ts">
  import { onMount } from 'svelte';
  import { eventBus } from '$lib/buses';
  import type { DeletedMessage } from '$lib/bricks/RecycleBinBrick';
  import MarkdownRenderer from '$lib/bricks/MessageScrollback/core/MarkdownRenderer.svelte';
  
  // State
  let deletedMessages = $state<DeletedMessage[]>([]);
  let hoveredTurnId = $state<string | null>(null);
  
  // Refs
  let scrollContainer: HTMLDivElement;
  
  onMount(() => {
    console.log('📜 RecycleBinScrollback: Initializing');
    
    // Listen for recycle bin data
    eventBus.subscribe('recyclebin:data', (data: any) => {
      deletedMessages = data.messages || [];
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
  
  // Format timestamp
  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }
  
  // Format deleted time
  function formatDeletedTime(deletedAt: number): string {
    const now = Date.now();
    const diff = now - deletedAt;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
</script>

<div class="scrollback-container" bind:this={scrollContainer}>
  <div class="messages">
    {#if deletedMessages.length === 0}
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <p>Recycle bin is empty</p>
        <span>Deleted messages will appear here</span>
      </div>
    {:else}
      {#each deletedMessages as message}
        <div 
          class="message-turn"
          onmouseenter={() => hoveredTurnId = message.turnId}
          onmouseleave={() => hoveredTurnId = null}
        >
          <!-- Deletion info -->
          <div class="deletion-info">
            <span class="deleted-time">Deleted {formatDeletedTime(message.deletedAt)}</span>
            {#if message.model}
              <span class="model-tag">{message.model}</span>
            {/if}
          </div>
          
          <!-- User message -->
          {#if message.userMessage}
            <div class="message">
              <div class="message-header">
                <span class="role-label boss">User</span>
              </div>
              <div class="message-content">
                <MarkdownRenderer content={message.userMessage} speaker="boss" />
              </div>
            </div>
          {/if}
          
          <!-- Assistant message -->
          {#if message.assistantMessage}
            <div class="message samara-message">
              <div class="message-header">
                <span class="role-label samara">Assistant</span>
              </div>
              <div class="message-content">
                <MarkdownRenderer content={message.assistantMessage} speaker="samara" />
              </div>
              
              <!-- Restore action icon -->
              {#if hoveredTurnId === message.turnId}
                <div class="action-icons">
                  <button 
                    class="action-icon restore-icon"
                    onclick={() => handleRestore(message.turnId)}
                    aria-label="Restore message"
                    title="Restore this message"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M2 8a6 6 0 0 1 10.39-4.1"/>
                      <polyline points="12 2 12 6 8 6"/>
                      <path d="M14 8a6 6 0 0 1-10.39 4.1"/>
                      <polyline points="4 14 4 10 8 10"/>
                    </svg>
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .scrollback-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px 20px 100px 20px;
    scroll-behavior: smooth;
  }
  
  .messages {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .message-turn {
    margin-bottom: 32px;
    position: relative;
    opacity: 0.9;
    transition: opacity 0.2s ease;
  }
  
  .message-turn:hover {
    opacity: 1;
  }
  
  .deletion-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding: 4px 8px;
    background: rgba(255, 0, 0, 0.05);
    border-left: 2px solid rgba(255, 0, 0, 0.3);
    border-radius: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .deleted-time {
    font-style: italic;
  }
  
  .model-tag {
    padding: 2px 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .message {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 8px;
  }
  
  .samara-message {
    position: relative;
  }
  
  .message-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .role-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .role-label.boss {
    background: rgba(100, 150, 255, 0.15);
    color: rgba(140, 180, 255, 0.9);
  }
  
  .role-label.samara {
    background: rgba(255, 180, 100, 0.15);
    color: rgba(255, 200, 140, 0.9);
  }
  
  .message-content {
    color: rgba(223, 208, 184, 0.95);
    line-height: 1.6;
    font-size: 14px;
  }
  
  /* Action icons - matching MessageScrollback style */
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
  
  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
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
  
  .restore-icon:hover {
    color: rgba(100, 255, 100, 0.9);
    background: rgba(100, 255, 100, 0.1);
  }
  
  .action-icon svg {
    width: 16px;
    height: 16px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    color: rgba(255, 255, 255, 0.3);
    text-align: center;
  }
  
  .empty-state svg {
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .empty-state p {
    font-size: 16px;
    margin: 0 0 8px 0;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .empty-state span {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.3);
  }
</style>