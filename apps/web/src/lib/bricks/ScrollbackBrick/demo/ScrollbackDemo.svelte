<script lang="ts">
  import { onMount } from 'svelte';
  import { ScrollbackBrick } from '../core/ScrollbackBrick';
  import ScrollbackUI from '../ui/ScrollbackUI.svelte';
  import { EventBus } from '../../../buses/EventBus';
  import { ConfigBus } from '../../../buses/ConfigBus';
  import { StateBus } from '../../../buses/StateBus';
  import { ErrorBus } from '../../../buses/ErrorBus';
  
  // Create demo buses
  let eventBus: EventBus;
  let configBus: ConfigBus;
  let stateBus: StateBus;
  let errorBus: ErrorBus;
  let scrollbackBrick: ScrollbackBrick | null = $state(null);
  
  let messageInput = '';
  let isStreaming = false;
  let currentStreamId = '';
  
  // Demo personas
  const personas = ['Boss', 'User', 'Developer'];
  let selectedPersona = 'Boss';
  
  // Demo models
  const models = ['gpt-4', 'claude-3', 'llama-2'];
  let selectedModel = 'gpt-4';
  
  // Send a user message
  function sendMessage() {
    if (!messageInput.trim() || !eventBus) return;
    
    eventBus.publish('message:sent', {
      content: messageInput,
      persona: selectedPersona
    });
    
    messageInput = '';
    
    // Simulate assistant response after a delay
    setTimeout(() => {
      simulateAssistantResponse();
    }, 500);
  }
  
  // Simulate assistant response
  function simulateAssistantResponse() {
    if (!eventBus) return;
    
    const responses = [
      "I understand your request. Let me help you with that.",
      "That's an interesting question! Here's what I think...",
      "Based on the information provided, I can suggest the following approach:",
      "Let me analyze this for you:\n\n• First, we should consider the context\n• Then, we can explore different solutions\n• Finally, we'll implement the best approach",
      "**Great question!** The answer involves several key points:\n\n• Understanding the fundamentals\n• Applying best practices\n• Testing thoroughly"
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    if (Math.random() > 0.5) {
      // Regular message
      eventBus.publish('message:received', {
        content: response,
        model: selectedModel
      });
    } else {
      // Streaming message
      simulateStreamingResponse(response);
    }
  }
  
  // Simulate streaming response
  function simulateStreamingResponse(fullText: string) {
    if (!eventBus) return;
    
    currentStreamId = `msg-${Date.now()}`;
    isStreaming = true;
    
    // Start streaming
    eventBus.publish('message:stream:start', {
      messageId: currentStreamId,
      model: selectedModel
    });
    
    // Stream chunks
    const words = fullText.split(' ');
    let currentContent = '';
    let wordIndex = 0;
    
    const streamInterval = setInterval(() => {
      if (wordIndex < words.length) {
        const chunk = words[wordIndex] + (wordIndex < words.length - 1 ? ' ' : '');
        currentContent += chunk;
        
        eventBus.publish('message:stream:chunk', {
          messageId: currentStreamId,
          chunk: chunk
        });
        
        wordIndex++;
      } else {
        // End streaming
        clearInterval(streamInterval);
        
        eventBus.publish('message:stream:end', {
          messageId: currentStreamId,
          finalContent: currentContent
        });
        
        isStreaming = false;
      }
    }, 100);
  }
  
  // Clear conversation
  function clearConversation() {
    if (!eventBus) return;
    
    eventBus.publish('conversation:clear', {});
  }
  
  // Load sample conversation
  function loadSampleConversation() {
    if (!eventBus) return;
    
    const sampleMessages = [
      {
        id: 'sample-1',
        role: 'user' as const,
        content: 'What is the capital of France?',
        timestamp: Date.now() - 10000,
        metadata: { persona: 'User' }
      },
      {
        id: 'sample-2',
        role: 'assistant' as const,
        content: 'The capital of France is **Paris**.',
        timestamp: Date.now() - 8000,
        metadata: { model: 'gpt-4' }
      },
      {
        id: 'sample-3',
        role: 'user' as const,
        content: 'Tell me more about it.',
        timestamp: Date.now() - 6000,
        metadata: { persona: 'User' }
      },
      {
        id: 'sample-4',
        role: 'assistant' as const,
        content: 'Paris is a beautiful city known for:\n\n• The Eiffel Tower\n• The Louvre Museum\n• Notre-Dame Cathedral\n• The Champs-Élysées',
        timestamp: Date.now() - 4000,
        metadata: { model: 'gpt-4' }
      }
    ];
    
    eventBus.publish('conversation:loaded', {
      conversationId: 'sample-conv-001',
      messages: sampleMessages
    });
  }
  
  // Initialize and listen for brick events
  onMount(() => {
    // Initialize buses and brick
    eventBus = new EventBus();
    configBus = new ConfigBus();
    stateBus = new StateBus();
    
    // ErrorBus needs eventBus and config
    const errorConfig = {
      captureGlobalErrors: false,
      deduplication: {
        enabled: false,
        windowMs: 1000
      },
      reporting: {
        console: true,
        remote: false
      }
    };
    errorBus = new ErrorBus(eventBus, errorConfig);
    
    scrollbackBrick = new ScrollbackBrick(
      eventBus,
      configBus,
      stateBus,
      errorBus
    );
    
    // Optional: Log events for debugging
    const unsubReady = eventBus.subscribe('scrollback:ready', () => {});
    const unsubScrolled = eventBus.subscribe('scrollback:scrolled', () => {});
    const unsubClicked = eventBus.subscribe('message:clicked', () => {});
    const unsubCopied = eventBus.subscribe('message:copied', () => {});
    
    return () => {
      unsubReady();
      unsubScrolled();
      unsubClicked();
      unsubCopied();
      scrollbackBrick?.destroy();
    };
  });
</script>

<div class="demo-container">
  <div class="demo-header">
    <h2>ScrollbackBrick Demo</h2>
    <div class="demo-controls">
      <button onclick={loadSampleConversation}>Load Sample</button>
      <button onclick={clearConversation}>Clear</button>
    </div>
  </div>
  
  <div class="scrollback-wrapper">
    {#if scrollbackBrick}
      <ScrollbackUI brick={scrollbackBrick} />
    {:else}
      <div class="loading">Loading ScrollbackBrick...</div>
    {/if}
  </div>
  
  <div class="demo-input">
    <div class="input-options">
      <select bind:value={selectedPersona}>
        {#each personas as persona}
          <option value={persona}>{persona}</option>
        {/each}
      </select>
      
      <select bind:value={selectedModel}>
        {#each models as model}
          <option value={model}>{model}</option>
        {/each}
      </select>
    </div>
    
    <div class="input-row">
      <input
        type="text"
        bind:value={messageInput}
        placeholder="Type a message..."
        onkeydown={(e) => e.key === 'Enter' && sendMessage()}
        disabled={isStreaming}
      />
      <button onclick={sendMessage} disabled={isStreaming}>
        {isStreaming ? 'Streaming...' : 'Send'}
      </button>
    </div>
  </div>
</div>

<style>
  .demo-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #0A0F17;
    color: #DFD0B8;
  }
  
  .demo-header {
    padding: 20px;
    border-bottom: 1px solid rgba(223, 208, 184, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .demo-header h2 {
    margin: 0;
    font-size: 24px;
  }
  
  .demo-controls {
    display: flex;
    gap: 10px;
  }
  
  .demo-controls button {
    padding: 8px 16px;
    background: rgba(249, 115, 22, 0.2);
    color: #f97316;
    border: 1px solid rgba(249, 115, 22, 0.3);
    border-radius: 4px;
    cursor: pointer;
  }
  
  .demo-controls button:hover {
    background: rgba(249, 115, 22, 0.3);
  }
  
  .scrollback-wrapper {
    flex: 1;
    overflow: hidden;
  }
  
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: rgba(223, 208, 184, 0.5);
  }
  
  .demo-input {
    padding: 20px;
    border-top: 1px solid rgba(223, 208, 184, 0.1);
  }
  
  .input-options {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .input-options select {
    padding: 6px 12px;
    background: #0A0F17;
    color: #DFD0B8;
    border: 1px solid rgba(223, 208, 184, 0.2);
    border-radius: 4px;
  }
  
  .input-row {
    display: flex;
    gap: 10px;
  }
  
  .input-row input {
    flex: 1;
    padding: 10px;
    background: #0A0F17;
    color: #DFD0B8;
    border: 1px solid rgba(223, 208, 184, 0.2);
    border-radius: 4px;
    font-size: 13px;
  }
  
  .input-row button {
    padding: 10px 20px;
    background: rgba(249, 115, 22, 0.2);
    color: #f97316;
    border: 1px solid rgba(249, 115, 22, 0.3);
    border-radius: 4px;
    cursor: pointer;
  }
  
  .input-row button:hover:not(:disabled) {
    background: rgba(249, 115, 22, 0.3);
  }
  
  .input-row button:disabled {
    cursor: not-allowed;
  }
</style>