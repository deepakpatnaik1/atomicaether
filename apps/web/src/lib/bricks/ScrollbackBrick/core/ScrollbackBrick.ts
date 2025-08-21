/**
 * ScrollbackBrick
 * LEGO brick for displaying message history
 * Connects only through the four standard buses
 */

import type { 
  EventBus, 
  ConfigBus, 
  StateBus, 
  ErrorBus 
} from '../../../buses/types';

import type { 
  Message, 
  ScrollbackState, 
  ScrollbackConfig 
} from '../models/ScrollbackModels';

// Event types are defined but we use any for now to simplify
// In production, we'd define proper types for the EventBus

import { ScrollbackService } from './ScrollbackService';

// Create a simple reactive store for state updates
type StateListener = () => void;

export class ScrollbackBrick {
  private service: ScrollbackService;
  private stateListeners: Set<StateListener> = new Set();
  private state: ScrollbackState = {
    messages: [],
    conversationId: '',
    scrollPosition: 0,
    isAtBottom: true
  };
  
  private config: ScrollbackConfig = {
    maxMessages: 100,
    autoScroll: true,
    showTimestamps: true,
    showMetadata: true,
    groupByTime: false,
    timeGroupingMinutes: 5
  };

  private theme: any = null;
  private streamingMessages = new Map<string, Message>();
  
  constructor(
    private eventBus: EventBus,
    private configBus: ConfigBus,
    private stateBus: StateBus,
    private errorBus: ErrorBus
  ) {
    this.service = new ScrollbackService(this.config);
    this.init();
  }

  private async init() {
    try {
      // Load configuration
      await this.loadConfig();
      
      // Subscribe to events
      this.subscribeToEvents();
      
      // Load existing conversation if any
      await this.loadConversation();
      
      // Announce ready
      this.eventBus.publish('scrollback:ready', { conversationId: this.state.conversationId });
      
    } catch (error) {
      // Only report to errorBus if it has proper config
      if (this.errorBus && typeof this.errorBus.report === 'function') {
        try {
          this.errorBus.report(error as Error, 'ScrollbackBrick', true);
        } catch (e) {
          console.warn('ScrollbackBrick: Could not report to ErrorBus', e);
        }
      } else {
        console.error('ScrollbackBrick initialization error:', error);
      }
    }
  }

  private async loadConfig() {
    try {
      // Load scrollback config
      const scrollbackConfig = await this.configBus.load<any>('scrollback');
      if (scrollbackConfig) {
        this.config = { ...this.config, ...scrollbackConfig };
        this.service = new ScrollbackService(this.config);
      }
      
      // Load theme
      this.theme = await this.configBus.load<any>('themes/rainy-night');
      
    } catch (error) {
      console.warn('ScrollbackBrick: Using default config', error);
    }
  }

  private subscribeToEvents() {
    // Message events
    this.eventBus.subscribe('message:sent', (detail: any) => {
      this.addUserMessage(detail.content, detail.persona);
    });
    
    this.eventBus.subscribe('message:received', (detail: any) => {
      this.addAssistantMessage(detail.content, detail.model);
    });
    
    // Streaming events
    this.eventBus.subscribe('message:stream:start', (detail: any) => {
      this.startStreamingMessage(detail.messageId, detail.model);
    });
    
    this.eventBus.subscribe('message:stream:chunk', (detail: any) => {
      this.updateStreamingMessage(detail.messageId, detail.chunk);
    });
    
    this.eventBus.subscribe('message:stream:end', (detail: any) => {
      this.finalizeStreamingMessage(detail.messageId, detail.finalContent);
    });
    
    // Conversation events
    this.eventBus.subscribe('conversation:loaded', (detail: any) => {
      this.loadMessages(detail.conversationId, detail.messages);
    });
    
    this.eventBus.subscribe('conversation:clear', () => {
      this.clearMessages();
    });
  }

  private async loadConversation() {
    try {
      // Try to get current conversation from state
      const conversationState = await this.stateBus.get<ScrollbackState>('currentConversation');
      if (conversationState) {
        this.state = conversationState;
      } else {
        // Create new conversation
        this.state.conversationId = `conv-${Date.now()}`;
      }
    } catch (error) {
      console.warn('ScrollbackBrick: No existing conversation', error);
    }
  }

  private async saveState() {
    try {
      await this.stateBus.set('currentConversation', this.state);
    } catch (error) {
      console.warn('ScrollbackBrick: Could not save state', error);
    }
  }

  private addUserMessage(content: string, persona?: string) {
    const message: Message = {
      id: this.service.generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now(),
      metadata: persona ? { persona } : undefined
    };
    
    this.addMessage(message);
  }

  private addAssistantMessage(content: string, model?: string) {
    const message: Message = {
      id: this.service.generateMessageId(),
      role: 'assistant',
      content,
      timestamp: Date.now(),
      metadata: model ? { model } : undefined
    };
    
    this.addMessage(message);
  }

  private startStreamingMessage(messageId: string, model?: string) {
    const message: Message = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      metadata: { 
        model,
        streaming: true
      }
    };
    
    this.streamingMessages.set(messageId, message);
    this.addMessage(message);
  }

  private updateStreamingMessage(messageId: string, chunk: string) {
    const message = this.streamingMessages.get(messageId);
    if (!message) return;
    
    message.content += chunk;
    
    // Update in state
    const index = this.state.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.state.messages[index] = { ...message };
      this.updateUI();
    }
  }

  private finalizeStreamingMessage(messageId: string, finalContent: string) {
    const message = this.streamingMessages.get(messageId);
    if (!message) return;
    
    message.content = finalContent;
    message.metadata = { 
      ...message.metadata,
      streaming: false
    };
    
    // Update in state
    const index = this.state.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.state.messages[index] = { ...message };
      this.streamingMessages.delete(messageId);
      this.updateUI();
      this.saveState();
    }
  }

  private addMessage(message: Message) {
    this.state.messages.push(message);
    this.state.messages = this.service.trimMessages(this.state.messages);
    this.state.newestMessageId = message.id;
    
    if (this.state.messages.length === 1) {
      this.state.oldestMessageId = message.id;
    }
    
    this.updateUI();
    this.saveState();
    
    // Auto-scroll if needed
    if (this.service.shouldAutoScroll(this.state.isAtBottom, message)) {
      this.scrollToBottom();
    }
  }

  private loadMessages(conversationId: string, messages: Message[]) {
    this.state.conversationId = conversationId;
    this.state.messages = messages;
    this.state.oldestMessageId = messages[0]?.id;
    this.state.newestMessageId = messages[messages.length - 1]?.id;
    
    this.updateUI();
    this.saveState();
  }

  private clearMessages() {
    const oldConversationId = this.state.conversationId;
    
    this.state.messages = [];
    this.state.conversationId = `conv-${Date.now()}`;
    this.state.scrollPosition = 0;
    this.state.isAtBottom = true;
    this.state.oldestMessageId = undefined;
    this.state.newestMessageId = undefined;
    
    this.streamingMessages.clear();
    
    this.updateUI();
    this.saveState();
    
    this.eventBus.publish('scrollback:cleared', { oldConversationId });
  }

  // Public methods for UI interaction
  public handleScroll(scrollPosition: number, isAtBottom: boolean) {
    this.state.scrollPosition = scrollPosition;
    this.state.isAtBottom = isAtBottom;
    
    this.eventBus.publish('scrollback:scrolled', { scrollPosition, isAtBottom });
  }

  public handleMessageClick(messageId: string) {
    const message = this.state.messages.find(m => m.id === messageId);
    if (message) {
      this.eventBus.publish('message:clicked', { message });
    }
  }

  public handleMessageCopy(messageId: string) {
    const message = this.state.messages.find(m => m.id === messageId);
    if (message) {
      navigator.clipboard.writeText(message.content);
      this.eventBus.publish('message:copied', { message });
    }
  }

  public scrollToBottom() {
    // This will be called by the UI component
    this.state.scrollPosition = Number.MAX_SAFE_INTEGER;
    this.state.isAtBottom = true;
  }

  private updateUI() {
    // Notify all listeners that state has changed
    this.stateListeners.forEach(listener => listener());
  }
  
  // Subscribe to state changes
  public subscribeToState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  // Getters for UI
  public getState(): ScrollbackState {
    return this.state;
  }

  public getTheme(): any {
    return this.theme;
  }

  public getService(): ScrollbackService {
    return this.service;
  }

  public getConfig(): ScrollbackConfig {
    return this.config;
  }

  // Cleanup
  public destroy() {
    // Clear all state listeners
    this.stateListeners.clear();
    // Save final state
    this.saveState();
  }
}