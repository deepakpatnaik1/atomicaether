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
    
    // BOSS REQUIREMENT: Listen for soft-delete events from MessageScrollback
    this.eventBus.subscribe('message:soft-deleted', (data: any) => {
      this.handleMessageSoftDeleted(data);
    });
    
    // Keep legacy support for old hard-delete events
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
    
    // BOSS REQUIREMENT: Listen for hard-delete requests from RecycleBin UI
    this.eventBus.subscribe('message:hard-delete', (data: any) => {
      this.handleHardDelete(data);
    });
    
    // Keep legacy support for permanent delete events
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
      
      // BOSS REQUIREMENT: Use onlyDeleted=true to fetch only soft-deleted entries
      const response = await fetch('/api/superjournal/read?onlyDeleted=true&limit=1000');
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
            // BOSS REQUIREMENT: Use actual deletedAt timestamp from SuperJournal
            deletedAt: entry.deletedAt || Date.now(),
            model: entry.metadata?.model || entry.model || entry.data?.model,
            persona: entry.metadata?.persona || entry.persona || entry.data?.persona
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
      
      // BOSS REQUIREMENT: Sort by createdAt timestamp (conversation chronology order)
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
  
  /**
   * BOSS REQUIREMENT: Handle soft-delete events from MessageScrollback
   * 
   * When a message is soft-deleted:
   * 1. It should appear in RecycleBin immediately
   * 2. It should be ordered by createdAt timestamp (conversation chronology)
   * 3. It should be restorable back to scrollback
   * 4. Data comes from the soft-delete event payload
   */
  private async handleMessageSoftDeleted(data: any) {
    const { turnId, deletedAt, messageData } = data;
    console.log(`🗑️ RecycleBin: Handling soft-delete for turn ${turnId}`);
    
    try {
      let deletedMessage: DeletedMessage;
      
      if (messageData) {
        // LIVE TURN: Use provided messageData directly (from current session)
        console.log('🔄 Processing live turn deletion with provided data');
        deletedMessage = {
          turnId: messageData.turnId,
          userMessage: messageData.userMessage,
          assistantMessage: messageData.assistantMessage,
          timestamp: messageData.timestamp,
          deletedAt: messageData.deletedAt,
          model: messageData.model,
          persona: messageData.persona
        };
        
      } else {
        // HISTORICAL TURN: Fetch from SuperJournal
        console.log('📜 Processing historical turn deletion from SuperJournal');
        const response = await fetch(`/api/superjournal/read?onlyDeleted=true&limit=1000`);
        if (!response.ok) {
          console.error('❌ Failed to fetch deleted entry from SuperJournal');
          return;
        }
        
        const responseData = await response.json();
        const entries = responseData.entries || [];
        
        // FIND THE DELETED ENTRY: Look for our specific turnId
        const deletedEntry = entries.find((entry: any) => entry.id === turnId);
        
        if (!deletedEntry) {
          console.error(`❌ Deleted entry ${turnId} not found in SuperJournal`);
          return;
        }
        
        // CONVERT TO DELETED MESSAGE: Create RecycleBin format
        const userMsg = deletedEntry.userMessage || deletedEntry.bossMessage || '';
        const assistantMsg = deletedEntry.assistantMessage || deletedEntry.samaraMessage || '';
        
        deletedMessage = {
          turnId: deletedEntry.id,
          userMessage: userMsg,
          assistantMessage: assistantMsg,
          timestamp: deletedEntry.timestamp || deletedEntry.createdAt,
          deletedAt: deletedEntry.deletedAt || deletedAt,
          model: deletedEntry.metadata?.model,
          persona: deletedEntry.metadata?.persona
        };
      }
      
      // AVOID DUPLICATES: Check if already in RecycleBin
      const existingIndex = this.deletedMessages.findIndex(m => m.turnId === turnId);
      if (existingIndex !== -1) {
        // UPDATE EXISTING: Update the deletion timestamp
        this.deletedMessages[existingIndex] = deletedMessage;
        console.log(`🔄 RecycleBin: Updated existing deleted message ${turnId}`);
      } else {
        // ADD NEW: Add to RecycleBin
        this.deletedMessages.push(deletedMessage);
        console.log(`➕ RecycleBin: Added new deleted message ${turnId}`);
      }
      
      // SORT BY CHRONOLOGY: BOSS REQUIREMENT - order by createdAt timestamp
      this.deletedMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // SAVE TO LOCALSTORAGE: Persist the updated RecycleBin state
      this.saveDeletedMessages();
      
      // PUBLISH UPDATE: Notify RecycleBin UI to refresh
      this.publishDeletedMessages();
      
      console.log(`✅ RecycleBin: Successfully processed soft-delete for ${turnId}`);
      
    } catch (error) {
      console.error(`❌ Error handling soft-delete for ${turnId}:`, error);
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
  
  /**
   * BOSS REQUIREMENT: Handle restore action (return message to scrollback)
   * 
   * Restore process:
   * 1. Remove deleted markers from SuperJournal (set status: 'active', remove deletedAt)
   * 2. Remove deleted markers from Journal entries for referential integrity
   * 3. Remove from RecycleBin localStorage
   * 4. Publish restore event for MessageScrollback to display again
   */
  private async handleMessageRestore(data: any) {
    const { turnId } = data;
    console.log(`♻️ RecycleBin: Starting restore for turn ${turnId}`);
    
    const messageIndex = this.deletedMessages.findIndex(m => m.turnId === turnId);
    if (messageIndex === -1) {
      console.error(`❌ Message ${turnId} not found in RecycleBin for restore`);
      return;
    }
    
    const messageToRestore = this.deletedMessages[messageIndex];
    
    try {
      // STEP 1: Call restore API to remove deleted markers from SuperJournal
      const response = await fetch('/api/superjournal/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ turnId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Failed to restore ${turnId} in SuperJournal:`, errorData.error);
        
        // Show error to user
        this.eventBus.publish('notification:show', {
          message: `Failed to restore message: ${errorData.error}`,
          type: 'error',
          duration: 5000
        });
        return;
      }
      
      const result = await response.json();
      console.log(`✅ SuperJournal: Restored ${turnId} - removed deleted markers`);
      
      // STEP 2: Remove from RecycleBin localStorage
      this.deletedMessages.splice(messageIndex, 1);
      this.saveDeletedMessages();
      
      // STEP 3: Prepare restored message data for MessageScrollback
      const restoredMessage = {
        turnId: messageToRestore.turnId,
        userMessage: messageToRestore.userMessage,
        assistantMessage: messageToRestore.assistantMessage,
        timestamp: messageToRestore.timestamp,
        model: messageToRestore.model,
        persona: messageToRestore.persona
      };
      
      // STEP 4: Publish restore event for MessageScrollback to handle
      // MessageScrollback will re-fetch from SuperJournal and display the restored message
      this.eventBus.publish('message:restored', restoredMessage);
      
      console.log(`♻️ RecycleBin: Successfully restored message ${turnId} to scrollback`);
      
      // STEP 5: Update RecycleBin UI to reflect removal
      this.publishDeletedMessages();
      
    } catch (error) {
      console.error(`❌ Error during restore for ${turnId}:`, error);
      this.errorBus.report(error as Error, 'RecycleBinBrick');
    }
  }
  
  /**
   * BOSS REQUIREMENT: Handle hard-delete action (permanent removal from all storage)
   * 
   * Hard-delete process:
   * 1. Remove from RecycleBin localStorage (immediate UI update)  
   * 2. Call hard-delete API endpoint to permanently remove from SuperJournal & Journal
   * 3. Update RecycleBin UI to reflect removal
   * 4. This action is irreversible - no recovery possible
   */
  private async handleHardDelete(data: any) {
    const { turnId } = data;
    console.log(`🔥 RecycleBin: Starting hard-delete for turn ${turnId}`);
    
    try {
      // STEP 1: Remove from RecycleBin localStorage immediately (optimistic update)
      const messageIndex = this.deletedMessages.findIndex(m => m.turnId === turnId);
      if (messageIndex === -1) {
        console.error(`❌ Message ${turnId} not found in RecycleBin`);
        return;
      }
      
      // Keep reference for rollback if API fails
      const messageToDelete = this.deletedMessages[messageIndex];
      
      // Remove from local state
      this.deletedMessages.splice(messageIndex, 1);
      this.saveDeletedMessages();
      
      // Update UI immediately
      this.publishDeletedMessages();
      
      console.log(`🗑️ RecycleBin: Removed ${turnId} from local state`);
      
      // STEP 2: Call hard-delete API endpoint for permanent removal
      const response = await fetch('/api/superjournal/hard-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ turnId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Hard-delete API failed for ${turnId}:`, errorData.error);
        
        // ROLLBACK: Restore message to RecycleBin if API failed
        this.deletedMessages.splice(messageIndex, 0, messageToDelete);
        this.deletedMessages.sort((a, b) => a.timestamp - b.timestamp);
        this.saveDeletedMessages();
        this.publishDeletedMessages();
        
        // Show error to user
        this.eventBus.publish('notification:show', {
          message: `Failed to permanently delete message: ${errorData.error}`,
          type: 'error',
          duration: 5000
        });
        return;
      }
      
      const result = await response.json();
      console.log(`✅ RecycleBin: Successfully hard-deleted ${turnId} from all storage`);
      console.log(`🔥 Permanent deletion completed - no recovery possible`);
      
    } catch (error) {
      console.error(`❌ Error during hard-delete for ${turnId}:`, error);
      
      // ROLLBACK: Restore message if there was an error
      const messageIndex = this.deletedMessages.findIndex(m => m.turnId === turnId);
      if (messageIndex === -1) {
        // Re-add the message since we removed it optimistically
        this.deletedMessages.push(data.messageToDelete);
        this.deletedMessages.sort((a, b) => a.timestamp - b.timestamp);
        this.saveDeletedMessages();
        this.publishDeletedMessages();
      }
      
      this.errorBus.report(error as Error, 'RecycleBinBrick');
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