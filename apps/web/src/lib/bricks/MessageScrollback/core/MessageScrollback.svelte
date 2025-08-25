<script lang="ts">
  import { onMount } from 'svelte';
  import { stateBus, eventBus } from '$lib/buses';
  import type { MessageTurnState, MessageTurn } from './types';
  import type { JournalEntry } from '$lib/bricks/SuperJournalBrick/core/types';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  
  // State
  let historicalTurns = $state<MessageTurn[]>([]);  // From SuperJournal
  let messageTurnState = $state<MessageTurnState | undefined>(undefined);
  let isLoadingHistory = $state(true);  // Loading state
  let hoveredTurnId = $state<string | null>(null);  // Track which message pair is hovered
  
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
  
  // Refs
  let scrollContainer: HTMLDivElement;
  
  // Scroll state management
  let isUserScrolling = $state(false);
  let lastMessageCount = $state(0);
  let lastContentLength = $state(0);
  let isNearBottom = $state(true);
  
  // Check if scrolled near bottom (within 100px)
  function checkIfNearBottom() {
    if (!scrollContainer) return true;
    const threshold = 100;
    return scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < threshold;
  }
  
  // Handle user scroll events
  function handleScroll() {
    isNearBottom = checkIfNearBottom();
    
    // If user scrolled back to bottom, resume auto-scroll
    if (isNearBottom) {
      isUserScrolling = false;
    } else {
      // User is reading older messages
      isUserScrolling = true;
    }
  }
  
  // Poll StateBus for updates
  $effect(() => {
    updateTrigger; // Access trigger to create dependency
    const state = stateBus.get('messageTurn') as MessageTurnState | undefined;
    messageTurnState = state;
  });
  
  // Smart auto-scroll - detects content changes and respects user scrolling
  $effect(() => {
    updateTrigger; // Trigger on polling updates
    const currentTurns = visibleTurns();
    const currentMessageCount = currentTurns.length;
    
    // Calculate total content length to detect streaming updates
    let currentContentLength = 0;
    if (currentTurns.length > 0) {
      const lastTurn = currentTurns[currentTurns.length - 1];
      if (lastTurn.samaraMessage) {
        currentContentLength = lastTurn.samaraMessage.content.length;
      }
    }
    
    // Check if new messages arrived
    const hasNewMessages = currentMessageCount > lastMessageCount;
    
    // Check if content is growing (streaming)
    const contentIsGrowing = currentContentLength > lastContentLength;
    
    if (scrollContainer && currentMessageCount > 0) {
      // Scenario A: Initial load or refresh - snap to bottom
      if (lastMessageCount === 0) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        isUserScrolling = false;
      }
      // Scenario B: New messages or streaming content and user is NOT scrolling - auto-scroll
      else if ((hasNewMessages || contentIsGrowing) && !isUserScrolling) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
      // Scenario C: User is scrolling up - don't interfere
      // (no action needed)
    }
    
    lastMessageCount = currentMessageCount;
    lastContentLength = currentContentLength;
  });
  
  // Load SuperJournal history and set up polling
  onMount(async () => {
    console.log('📜 MessageScrollback mounted');
    // Load historical messages from SuperJournal
    await loadHistoricalMessages();
    
    // Listen for restored messages from RecycleBin
    eventBus.subscribe('message:restored', (message: any) => {
      console.log('♻️ Restoring message:', message.turnId);
      
      // Add to historical turns (at the correct position based on timestamp)
      const restoredTurn = {
        id: message.turnId,
        bossMessage: message.userMessage ? { content: message.userMessage, timestamp: message.timestamp } : null,
        samaraMessage: message.assistantMessage ? { content: message.assistantMessage, timestamp: message.timestamp } : null
      };
      
      // Insert in chronological order
      const insertIndex = historicalTurns.findIndex(turn => {
        const turnTimestamp = turn.bossMessage?.timestamp || turn.samaraMessage?.timestamp || 0;
        return turnTimestamp > message.timestamp;
      });
      
      if (insertIndex === -1) {
        historicalTurns.push(restoredTurn);
      } else {
        historicalTurns.splice(insertIndex, 0, restoredTurn);
      }
      
      // Trigger re-render
      historicalTurns = [...historicalTurns];
      
      // Also restore to SuperJournal
      restoreToSuperJournal(message);
    });
    
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
      
      // Check localStorage cache first
      const cacheKey = 'superjournal_cache';
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const { entries, timestamp } = JSON.parse(cached);
          const cacheAge = Date.now() - timestamp;
          
          // Use cache if less than 5 minutes old
          if (cacheAge < 5 * 60 * 1000) {
            console.log('📜 Using cached messages (age:', Math.round(cacheAge/1000), 'seconds)');
            processEntries(entries);
            isLoadingHistory = false;
            
            // Fetch fresh data in background
            fetchAndUpdateCache(cacheKey);
            return;
          }
        } catch (e) {
          console.warn('📜 Invalid cache, fetching fresh');
        }
      }
      
      isLoadingHistory = true;
      
      // Fetch from SuperJournal read endpoint
      const response = await fetch('/api/superjournal/read?limit=1000');
      
      if (!response.ok) {
        console.warn('📜 Could not load historical messages:', response.statusText);
        return;
      }
      
      const data = await response.json();
      const entries: JournalEntry[] = data.entries || [];
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify({
        entries,
        timestamp: Date.now()
      }));
      
      processEntries(entries);
      
      // Auto-scroll to bottom after loading history
      setTimeout(() => {
        if (scrollContainer && historicalTurns.length > 0) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          console.log('📜 Scrolled to most recent message');
        }
      }, 100);
      
    } catch (error) {
      console.error('📜 Error loading historical messages:', error);
    } finally {
      isLoadingHistory = false;
    }
  }
  
  // Process entries and convert to MessageTurn format
  function processEntries(entries: JournalEntry[]) {
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
  }
  
  // Fetch fresh data in background and update cache
  async function fetchAndUpdateCache(cacheKey: string) {
    try {
      const response = await fetch('/api/superjournal/read?limit=1000');
      if (response.ok) {
        const data = await response.json();
        const entries: JournalEntry[] = data.entries || [];
        
        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify({
          entries,
          timestamp: Date.now()
        }));
        
        // Update display if there are new messages
        if (entries.length > historicalTurns.length) {
          console.log('📜 Found new messages in background fetch');
          processEntries(entries);
        }
      }
    } catch (error) {
      console.log('📜 Background fetch failed:', error);
    }
  }
  
  // Handle delete action
  async function handleDelete(turnId: string) {
    // First, delete from SuperJournal (permanent storage)
    try {
      const response = await fetch('/api/superjournal/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ turnId })
      });
      
      if (!response.ok) {
        console.error('Failed to delete from SuperJournal');
        eventBus.publish('notification:show', {
          message: 'Failed to delete message',
          type: 'error',
          duration: 3000
        });
        return;
      }
      
      console.log('🧠 SuperJournal: Deleted turn:', turnId);
    } catch (error) {
      console.error('Error deleting from SuperJournal:', error);
      eventBus.publish('notification:show', {
        message: 'Failed to delete message',
        type: 'error',
        duration: 3000
      });
      return;
    }
    
    // Remove from historical turns
    historicalTurns = historicalTurns.filter(turn => turn.id !== turnId);
    
    // Also remove from live turns if present
    if (messageTurnState) {
      const updatedTurns = messageTurnState.turns.filter(turn => turn.id !== turnId);
      stateBus.set('messageTurn', {
        ...messageTurnState,
        turns: updatedTurns
      });
    }
    
    // Update localStorage cache to reflect deletion
    const cacheKey = 'superjournal_cache';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { entries, timestamp } = JSON.parse(cached);
        const filteredEntries = entries.filter((e: any) => e.id !== turnId);
        localStorage.setItem(cacheKey, JSON.stringify({
          entries: filteredEntries,
          timestamp
        }));
      } catch (e) {
        console.error('Failed to update cache:', e);
      }
    }
    
    // Publish event for other components
    eventBus.publish('message:deleted', { turnId });
    
    // Clear hover state
    hoveredTurnId = null;
  }
  
  // Handle copy action
  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      
      // Show subtle feedback
      eventBus.publish('notification:show', {
        message: 'Copied to clipboard',
        type: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      eventBus.publish('notification:show', {
        message: 'Failed to copy',
        type: 'error',
        duration: 2000
      });
    }
  }
  
  // Restore message to SuperJournal
  async function restoreToSuperJournal(message: any) {
    try {
      const entry: JournalEntry = {
        id: message.turnId,
        type: 'message-turn',
        timestamp: message.timestamp,
        data: {
          turnId: message.turnId,
          userMessage: message.userMessage,
          assistantMessage: message.assistantMessage,
          model: message.model,
          persona: message.persona
        }
      };
      
      const response = await fetch('/api/superjournal/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry })
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore to SuperJournal');
      }
      
      console.log('🧠 SuperJournal: Restored turn:', message.turnId);
      
      // Update cache
      const cacheKey = 'superjournal_cache';
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { entries, timestamp } = JSON.parse(cached);
          entries.push(entry);
          entries.sort((a: any, b: any) => a.timestamp - b.timestamp);
          localStorage.setItem(cacheKey, JSON.stringify({ entries, timestamp }));
        } catch (e) {
          console.error('Failed to update cache:', e);
        }
      }
    } catch (error) {
      console.error('Failed to restore to SuperJournal:', error);
      eventBus.publish('notification:show', {
        message: 'Failed to restore message',
        type: 'error',
        duration: 3000
      });
    }
  }
</script>

<div class="scrollback-container" bind:this={scrollContainer} onscroll={handleScroll}>
  <div class="messages-area">
    {#each visibleTurns() as turn}
      <div 
        class="message-turn"
        onmouseenter={() => hoveredTurnId = turn.id}
        onmouseleave={() => hoveredTurnId = null}
      >
        {#if turn.bossMessage}
          <div class="message">
            <div class="message-header">
              <span class="role-label role-label-boss">Boss</span>
            </div>
            <div class="message-content">
              <MarkdownRenderer content={turn.bossMessage.content} speaker="boss" />
            </div>
          </div>
        {/if}
        
        {#if turn.samaraMessage}
          <div class="message samara-message position-relative">
            <div class="message-header">
              <span class="role-label role-label-samara">Samara</span>
            </div>
            <div class="message-content">
              <MarkdownRenderer content={turn.samaraMessage.content} speaker="samara" />
            </div>
            
            <!-- Professional action icons -->
            {#if hoveredTurnId === turn.id}
              <div class="action-icons-group">
                <button 
                  class="icon-button"
                  onclick={() => handleCopy(turn.samaraMessage.content)}
                  aria-label="Copy message"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="5.5" y="5.5" width="8" height="8" rx="1"/>
                    <path d="M10.5 5.5V3.5C10.5 2.94772 10.0523 2.5 9.5 2.5H3.5C2.94772 2.5 2.5 2.94772 2.5 3.5V9.5C2.5 10.0523 2.94772 10.5 3.5 10.5H5.5"/>
                  </svg>
                </button>
                <button 
                  class="icon-button"
                  onclick={() => handleDelete(turn.id)}
                  aria-label="Delete message"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M5.5 2.5V1.5C5.5 1.22386 5.72386 1 6 1H10C10.2761 1 10.5 1.22386 10.5 1.5V2.5M2 4H14M3 4V13.5C3 14.0523 3.44772 14.5 4 14.5H12C12.5523 14.5 13 14.0523 13 13.5V4M6.5 7V11.5M9.5 7V11.5"/>
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
        Loading message history...
      </div>
    {:else if visibleTurns().length === 0}
      <div class="empty-state">
        No messages yet. Start a conversation!
      </div>
    {/if}
  </div>
</div>

<style>
  @import '$lib/../styles/shared.css';
  
  /* Component-specific styles only */
  .message {
    margin-bottom: var(--scrollback-messages-gap);
    padding-right: 3px;
  }
  
  .message-header {
    margin-bottom: 10px;
  }
  
  .samara-message {
    margin-bottom: var(--scrollback-messages-gap);
  }
</style>