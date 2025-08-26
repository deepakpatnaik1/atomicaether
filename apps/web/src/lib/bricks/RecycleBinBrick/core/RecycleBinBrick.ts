import type { EventBus, StateBus, ConfigBus, ErrorBus } from '../../../buses/types';
import type { MessagePairSet } from '../../MessageTurnBrick/types/MessageTurn.types';

export interface DeletedMessage {
  turnId: string;
  userMessage: string;
  assistantMessage: string;
  timestamp: number;
  deletedAt: number;
  model?: string;
  persona?: string;
}

export interface DeletedMessagePairSet extends MessagePairSet {
  // MessagePairSet already has deletedAt and status fields
  // This interface exists for type clarity in RecycleBin operations
}

export class RecycleBinBrick {
  private deletedMessages: DeletedMessage[] = [];
  private deletedPairSets: DeletedMessagePairSet[] = [];
  private readonly STORAGE_KEY = 'atomicaether:recycle-bin';
  private readonly PAIRSET_STORAGE_KEY = 'atomicaether:recycle-bin-pairsets';
  
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
    this.loadPairSets();
    
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
    
    // NEW: Listen for MessagePairSet deletion events
    this.eventBus.subscribe('messagePairSet:deleted', (data: any) => {
      this.handlePairSetDeleted(data);
    });
    
    // NEW: Listen for MessagePairSet restore requests
    this.eventBus.subscribe('messagePairSet:restore', (data: any) => {
      this.handlePairSetRestore(data);
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
        // Handle both old format (bossMessage/samaraMessage) and new format
        const userMsg = entry.userMessage || entry.bossMessage || entry.data?.userMessage || '';
        const assistantMsg = entry.assistantMessage || entry.samaraMessage || entry.data?.assistantMessage || '';
        
        if (userMsg || assistantMsg) {
          const deleted: DeletedMessage = {
            turnId: entry.id,
            userMessage: userMsg,
            assistantMessage: assistantMsg,
            timestamp: entry.timestamp,
            deletedAt: Date.now(), // We don't have exact deletion time
            model: entry.model || entry.data?.model,
            persona: entry.persona || entry.data?.persona
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
      
      // Sort by conversation chronology (oldest first for natural conversation flow)
      this.deletedMessages.sort((a, b) => a.timestamp - b.timestamp);
      
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
  
  // NEW: MessagePairSet Methods
  
  /**
   * Handle deletion of a MessagePairSet (both original and trimmed versions)
   * This ensures synchronized lifecycle management
   */
  private async handlePairSetDeleted(data: { messagePairSet: MessagePairSet }) {
    const { messagePairSet } = data;
    
    // Mark the MessagePairSet as deleted
    const deletedPairSet: DeletedMessagePairSet = {
      ...messagePairSet,
      deletedAt: Date.now(),
      status: 'deleted'
    };
    
    // Add to deleted pair sets
    this.deletedPairSets.unshift(deletedPairSet);
    this.savePairSets();
    
    console.log(`🗑️ RecycleBin: MessagePairSet ${messagePairSet.id} moved to trash (original + trimmed)`);
    
    // Update recycle bin view
    this.publishDeletedMessages();
  }
  
  /**
   * Handle restoration of a MessagePairSet (both original and trimmed versions)
   */
  private async handlePairSetRestore(data: { pairSetId: string }) {
    const { pairSetId } = data;
    
    const pairSetIndex = this.deletedPairSets.findIndex(ps => ps.id === pairSetId);
    if (pairSetIndex !== -1) {
      const pairSetToRestore = this.deletedPairSets[pairSetIndex];
      
      // Remove from recycle bin
      this.deletedPairSets.splice(pairSetIndex, 1);
      this.savePairSets();
      
      // Restore to active status
      const restoredPairSet: MessagePairSet = {
        ...pairSetToRestore,
        status: 'active',
        updatedAt: Date.now()
      };
      delete restoredPairSet.deletedAt;
      
      // Publish restore event
      this.eventBus.publish('messagePairSet:restored', { messagePairSet: restoredPairSet });
      
      console.log(`♻️ RecycleBin: MessagePairSet ${pairSetId} restored (original + trimmed)`);
      
      // Update recycle bin view
      this.publishDeletedMessages();
    }
  }
  
  /**
   * Save deleted MessagePairSets to localStorage
   */
  private savePairSets() {
    try {
      localStorage.setItem(this.PAIRSET_STORAGE_KEY, JSON.stringify(this.deletedPairSets));
    } catch (error) {
      console.error('Failed to save deleted MessagePairSets:', error);
      this.errorBus.report(error as Error, 'RecycleBinBrick');
    }
  }
  
  /**
   * Load deleted MessagePairSets from localStorage
   */
  private loadPairSets() {
    try {
      const stored = localStorage.getItem(this.PAIRSET_STORAGE_KEY);
      if (stored) {
        this.deletedPairSets = JSON.parse(stored);
        console.log(`🗑️ RecycleBin: Loaded ${this.deletedPairSets.length} deleted MessagePairSets from localStorage`);
      }
    } catch (error) {
      console.error('Failed to load deleted MessagePairSets:', error);
      this.deletedPairSets = [];
    }
  }
}