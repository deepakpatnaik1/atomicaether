<script lang="ts">
  import { onMount } from 'svelte';
  import { stateBus } from '$lib/buses';
  import type { MessageTurnState, MessageTurn } from './types';
  import type { JournalEntry } from '$lib/bricks/SuperJournalBrick/core/types';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  
  // State
  let historicalTurns = $state<MessageTurn[]>([]);  // From SuperJournal
  let messageTurnState = $state<MessageTurnState | undefined>(undefined);
  
  // Get live turns from MessageTurnBrick
  let liveTurns = $derived(messageTurnState?.turns || []);
  
  // Combine historical and live turns (avoiding duplicates)
  let visibleTurns = $derived(() => {
    const historicalIds = new Set(historicalTurns.map(t => t.id));
    const uniqueLiveTurns = liveTurns.filter(turn => !historicalIds.has(turn.id));
    return [...historicalTurns, ...uniqueLiveTurns];
  });
  
  // Reactive trigger for polling
  let updateTrigger = $state(0);
  let historyLoaded = $state(false);
  
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
    if (scrollContainer && scrollbackConfig.autoScroll && visibleTurns().length > 0) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
  
  // Load SuperJournal history and set up polling
  onMount(async () => {
    console.log('📜 MessageScrollback mounted');
    // Load historical messages from SuperJournal
    await loadHistoricalMessages();
    
    // Set up polling interval for live updates
    const interval = setInterval(() => {
      updateTrigger++;
    }, 100); // Poll every 100ms
    
    return () => clearInterval(interval);
  });
  
  // Load historical messages from SuperJournal
  async function loadHistoricalMessages() {
    try {
      console.log('📜 Loading historical messages from SuperJournal...');
      
      // Fetch from SuperJournal read endpoint
      const response = await fetch('/api/superjournal/read?limit=1000');
      
      if (!response.ok) {
        console.warn('📜 Could not load historical messages:', response.statusText);
        historyLoaded = true;
        return;
      }
      
      const data = await response.json();
      console.log('📜 SuperJournal read response:', data);
      const entries: JournalEntry[] = data.entries || [];
      
      // Convert SuperJournal entries to MessageTurn format
      historicalTurns = entries.map((entry, index) => ({
        id: entry.id,
        turnNumber: entry.turnNumber || index + 1,
        bossMessage: {
          id: `boss-${entry.id}`,
          content: entry.bossMessage,
          persona: entry.metadata?.persona || 'default',
          model: entry.metadata?.model || 'unknown',
          timestamp: entry.timestamp
        },
        samaraMessage: {
          id: `samara-${entry.id}`,
          content: entry.samaraMessage,
          model: entry.metadata?.model || 'unknown',
          timestamp: entry.timestamp,
          processingTime: entry.metadata?.streamDuration
        },
        status: 'completed' as const,
        startedAt: entry.timestamp,
        completedAt: entry.timestamp
      }));
      
      // Sort by timestamp (oldest first)
      historicalTurns.sort((a, b) => a.startedAt - b.startedAt);
      
      console.log(`📜 Loaded ${historicalTurns.length} historical message pairs`);
      historyLoaded = true;
      
      // Auto-scroll to bottom after loading history
      setTimeout(() => {
        if (scrollContainer && historicalTurns.length > 0) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          console.log('📜 Scrolled to most recent message');
        }
      }, 100);
      
    } catch (error) {
      console.error('📜 Error loading historical messages:', error);
      historyLoaded = true;
    }
  }
</script>

<div class="scrollback-container" bind:this={scrollContainer}>
  <div class="messages">
    {#each visibleTurns() as turn}
      <div class="message-turn">
        {#if turn.bossMessage}
          <div class="message">
            <div class="message-header">
              <span class="role-label boss">Boss</span>
            </div>
            <div class="message-content">
              <MarkdownRenderer content={turn.bossMessage.content} speaker="boss" />
            </div>
          </div>
        {/if}
        
        {#if turn.samaraMessage}
          <div class="message">
            <div class="message-header">
              <span class="role-label samara">Samara</span>
            </div>
            <div class="message-content">
              <MarkdownRenderer content={turn.samaraMessage.content} speaker="samara" />
            </div>
          </div>
        {/if}
      </div>
    {/each}
    
    {#if visibleTurns().length === 0}
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
    word-break: break-word;
  }
  
  /* Role labels - from scrollback.roleLabel */
  .role-label {
    padding: 2px 8px;
    font-family: 'Inter', system-ui, sans-serif;
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