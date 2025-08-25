import type { EventBus, StateBus, ConfigBus, ErrorBus } from '../../../buses/types';

export interface DeletedMessage {
  turnId: string;
  userMessage: string;
  assistantMessage: string;
  timestamp: number;
  deletedAt: number;
  model?: string;
  persona?: string;
}

export class RecycleBinBrick {
  private deletedMessages: DeletedMessage[] = [];
  private readonly STORAGE_KEY = 'atomicaether:recycle-bin';
  
  constructor(
    private eventBus: EventBus,
    private stateBus: StateBus,
    private configBus: ConfigBus,
    private errorBus: ErrorBus
  ) {
    this.initialize();
  }
  
  private async initialize() {
    console.log('🗑️ RecycleBin: Initializing trash management system');
    
    // Load deleted messages from localStorage
    this.loadDeletedMessages();
    
    // Listen for message deletion events
    this.eventBus.subscribe('message:deleted', (data: any) => {
      this.handleMessageDeleted(data);
    });
    
    // Listen for restore requests
    this.eventBus.subscribe('message:restore', (data: any) => {
      this.handleMessageRestore(data);
    });
    
    // Listen for recycle bin data requests
    this.eventBus.subscribe('recyclebin:request', () => {
      this.publishDeletedMessages();
    });
    
    // Listen for permanent delete requests
    this.eventBus.subscribe('message:delete-permanent', (data: any) => {
      this.handlePermanentDelete(data);
    });
  }
  
  private loadDeletedMessages() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.deletedMessages = JSON.parse(stored);
        console.log(`🗑️ RecycleBin: Loaded ${this.deletedMessages.length} deleted messages`);
      }
    } catch (error) {
      console.error('Failed to load deleted messages:', error);
      this.deletedMessages = [];
    }
  }
  
  private saveDeletedMessages() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.deletedMessages));
    } catch (error) {
      console.error('Failed to save deleted messages:', error);
      this.errorBus.report(error as Error, 'RecycleBinBrick');
    }
  }
  
  private async handleMessageDeleted(data: any) {
    const { turnId } = data;
    
    // Get the message data from stateBus
    const messages = await this.stateBus.get('messages') || [];
    const messageToDelete = messages.find((m: any) => m.turnId === turnId);
    
    if (messageToDelete) {
      // Add to recycle bin
      const deletedMessage: DeletedMessage = {
        turnId: messageToDelete.turnId,
        userMessage: messageToDelete.userMessage,
        assistantMessage: messageToDelete.assistantMessage,
        timestamp: messageToDelete.timestamp,
        deletedAt: Date.now(),
        model: messageToDelete.model,
        persona: messageToDelete.persona
      };
      
      this.deletedMessages.unshift(deletedMessage); // Add to beginning
      this.saveDeletedMessages();
      
      console.log(`🗑️ RecycleBin: Message ${turnId} moved to trash`);
      
      // Publish update
      this.publishDeletedMessages();
    }
  }
  
  private async handleMessageRestore(data: any) {
    const { turnId } = data;
    
    const messageIndex = this.deletedMessages.findIndex(m => m.turnId === turnId);
    if (messageIndex !== -1) {
      const messageToRestore = this.deletedMessages[messageIndex];
      
      // Remove from recycle bin
      this.deletedMessages.splice(messageIndex, 1);
      this.saveDeletedMessages();
      
      // Restore to main messages
      const restoredMessage = {
        turnId: messageToRestore.turnId,
        userMessage: messageToRestore.userMessage,
        assistantMessage: messageToRestore.assistantMessage,
        timestamp: messageToRestore.timestamp,
        model: messageToRestore.model,
        persona: messageToRestore.persona
      };
      
      // Publish restore event for MessageScrollback to handle
      this.eventBus.publish('message:restored', restoredMessage);
      
      console.log(`♻️ RecycleBin: Message ${turnId} restored`);
      
      // Update recycle bin view
      this.publishDeletedMessages();
    }
  }
  
  private handlePermanentDelete(data: any) {
    const { turnId } = data;
    
    const messageIndex = this.deletedMessages.findIndex(m => m.turnId === turnId);
    if (messageIndex !== -1) {
      this.deletedMessages.splice(messageIndex, 1);
      this.saveDeletedMessages();
      
      console.log(`🔥 RecycleBin: Message ${turnId} permanently deleted`);
      
      // Update recycle bin view
      this.publishDeletedMessages();
    }
  }
  
  private publishDeletedMessages() {
    this.eventBus.publish('recyclebin:data', {
      messages: this.deletedMessages,
      count: this.deletedMessages.length
    });
  }
}