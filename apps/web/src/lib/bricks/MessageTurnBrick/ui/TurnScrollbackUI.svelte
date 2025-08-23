<script lang="ts">
  import { onMount } from 'svelte';
  import { stateBus } from '$lib/buses';
  import type { MessageTurn, MessageTurnState } from '../types/MessageTurn.types';
  
  let turns: MessageTurn[] = [];
  
  onMount(() => {
    console.log('📜 TurnScrollbackUI: Mounting...');
  });
  
  // Use Svelte reactivity to watch for state changes
  $: {
    const state = stateBus.get('messageTurn') as MessageTurnState;
    if (state && state.turns) {
      turns = state.turns;
      console.log('📜 TurnScrollbackUI: Updated turns', turns.length);
    }
  }
  
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="turn-scrollback-container">
  {#if turns.length === 0}
    <div class="empty-state">
      <p>No messages yet. Start a conversation!</p>
    </div>
  {:else}
    <div class="turns-list">
      {#each turns as turn (turn.id)}
        <div class="message-turn" data-status={turn.status}>
          <!-- Boss Message -->
          <div class="boss-message">
            <div class="message-header">
              <span class="persona">{turn.bossMessage.persona}</span>
              <span class="timestamp">{formatTime(turn.bossMessage.timestamp)}</span>
            </div>
            <div class="message-content">
              {turn.bossMessage.content}
            </div>
            {#if turn.bossMessage.fileMetadata && turn.bossMessage.fileMetadata.length > 0}
              <div class="file-attachments">
                {#each turn.bossMessage.fileMetadata as file}
                  <div class="file-tag">
                    📎 {file.name}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
          
          <!-- Samara Message -->
          {#if turn.samaraMessage}
            <div class="samara-message">
              <div class="message-header">
                <span class="persona">Samara</span>
                <span class="timestamp">{formatTime(turn.samaraMessage.timestamp)}</span>
              </div>
              <div class="message-content">
                {turn.samaraMessage.content}
              </div>
            </div>
          {:else if turn.status === 'processing'}
            <div class="samara-message processing">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          {:else if turn.status === 'error'}
            <div class="samara-message error">
              <div class="error-message">
                Error: {turn.error || 'Failed to get response'}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .turn-scrollback-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px 20px 120px;
    height: calc(100vh - 114px);
    overflow-y: auto;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px;
    color: var(--text-color-muted, #666);
  }
  
  .turns-list {
    display: flex;
    flex-direction: column;
    gap: 30px;
  }
  
  .message-turn {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .boss-message,
  .samara-message {
    padding: 15px;
    border-radius: 8px;
    background: var(--message-background, rgba(255, 255, 255, 0.05));
    border: 1px solid var(--message-border, rgba(255, 255, 255, 0.1));
  }
  
  .message-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 0.9em;
  }
  
  .persona {
    font-weight: 600;
    color: var(--text-color-primary, #DFD0B8);
  }
  
  .timestamp {
    color: var(--text-color-muted, #999);
  }
  
  .message-content {
    line-height: 1.6;
    color: var(--text-color, #e0e0e0);
    white-space: pre-wrap;
  }
  
  .file-attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  
  .file-tag {
    padding: 4px 8px;
    background: var(--file-tag-background, rgba(255, 255, 255, 0.1));
    border-radius: 4px;
    font-size: 0.85em;
    color: var(--text-color-muted, #999);
  }
  
  .samara-message.processing {
    display: flex;
    align-items: center;
    min-height: 60px;
  }
  
  .typing-indicator {
    display: flex;
    gap: 4px;
  }
  
  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: var(--text-color-muted, #999);
    border-radius: 50%;
    animation: typing 1.4s infinite;
  }
  
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes typing {
    0%, 60%, 100% {
      opacity: 0.3;
    }
    30% {
      opacity: 1;
    }
  }
  
  .samara-message.error {
    background: rgba(255, 0, 0, 0.1);
    border-color: rgba(255, 0, 0, 0.3);
  }
  
  .error-message {
    color: #ff6b6b;
  }
  
  /* Hide scrollbar for cleaner look */
  .turn-scrollback-container::-webkit-scrollbar {
    display: none;
  }
  
  .turn-scrollback-container {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>