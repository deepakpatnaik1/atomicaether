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
    
    // Load deleted messages from localStorage first (for immediate display)
    this.loadDeletedMessages();
    
    // Then load from SuperJournal (may have more/different entries)
    this.loadDeletedMessagesFromSuperJournal();
    
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
        console.log(`🗑️ RecycleBin: Loaded ${this.deletedMessages.length} deleted messages from localStorage`);
      }
    } catch (error) {
      console.error('Failed to load deleted messages:', error);
      this.deletedMessages = [];
    }
  }
  
  private async loadDeletedMessagesFromSuperJournal() {
    try {
      console.log('🗑️ RecycleBin: Loading deleted messages from SuperJournal...');
      
      const response = await fetch('/api/superjournal/deleted');
      if (!response.ok) {
        console.error('Failed to fetch deleted messages from SuperJournal');
        return;
      }
      
      const data = await response.json();
      const entries = data.entries || [];
      
      console.log(`🗑️ RecycleBin: Found ${entries.length} deleted entries in SuperJournal`);
      
      // Convert SuperJournal entries to DeletedMessage format
      const superJournalDeleted: DeletedMessage[] = [];
      
      for (const entry of entries) {
        if (entry.type === 'message-turn' && entry.data) {
          const deleted: DeletedMessage = {
            turnId: entry.id,
            userMessage: entry.data.userMessage || '',
            assistantMessage: entry.data.assistantMessage || '',
            timestamp: entry.timestamp,
            deletedAt: Date.now(), // We don't have exact deletion time
            model: entry.data.model,
            persona: entry.data.persona
          };
          superJournalDeleted.push(deleted);
        }
      }
      
      // Merge with existing (avoiding duplicates)
      const existingIds = new Set(this.deletedMessages.map(m => m.turnId));
      
      for (const message of superJournalDeleted) {
        if (!existingIds.has(message.turnId)) {
          this.deletedMessages.push(message);
        }
      }
      
      // Sort by deletion time (most recent first)
      this.deletedMessages.sort((a, b) => b.deletedAt - a.deletedAt);
      
      // Save the merged list
      this.saveDeletedMessages();
      
      // Publish updated list
      this.publishDeletedMessages();
      
      console.log(`🗑️ RecycleBin: Total deleted messages: ${this.deletedMessages.length}`);
      
    } catch (error) {
      console.error('Failed to load deleted messages from SuperJournal:', error);
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