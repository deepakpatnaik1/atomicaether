<script lang="ts">
  import { onMount } from 'svelte';
  import { stateBus } from '$lib/buses';
  import type { MessageTurnState, MessageTurn } from './types';
  import type { JournalEntry } from '$lib/bricks/SuperJournalBrick/core/types';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  
  // State
  let historicalTurns = $state<MessageTurn[]>([]);  // From SuperJournal
  let messageTurnState = $state<MessageTurnState | undefined>(undefined);
  let isLoadingHistory = $state(true);  // Loading state
  
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
  
  // Smart auto-scroll - only when new content arrives and user isn't scrolling
  $effect(() => {
    updateTrigger; // Trigger on polling updates
    const currentTurns = visibleTurns();
    const currentMessageCount = currentTurns.length;
    
    // Check if new messages arrived
    const hasNewMessages = currentMessageCount > lastMessageCount;
    
    // Also check if content is actively streaming (last message is in_progress)
    const isActivelyStreaming = currentTurns.length > 0 && 
      currentTurns[currentTurns.length - 1].status === 'in_progress';
    
    if (scrollContainer && currentMessageCount > 0) {
      // Scenario A: Initial load or refresh - snap to bottom
      if (lastMessageCount === 0) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        isUserScrolling = false;
      }
      // Scenario B: New messages or streaming content and user is at bottom - auto-scroll
      else if ((hasNewMessages || isActivelyStreaming) && !isUserScrolling) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
      // Scenario C: User is scrolling up - don't interfere
      // (no action needed)
    }
    
    lastMessageCount = currentMessageCount;
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
</script>

<div class="scrollback-container" bind:this={scrollContainer} onscroll={handleScroll}>
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
  
  /* Loading state */
  .loading-state {
    text-align: center;
    opacity: 0.7;
    padding: 2rem;
    color: #DFD0B8;
    font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 0.3; }
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