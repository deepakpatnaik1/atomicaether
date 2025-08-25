/**
 * JournalBrick - Machine-Trimmed Memory System
 * 
 * Stores compressed versions of conversations in the atomicaether-journal R2 bucket.
 * Works alongside SuperJournalBrick to provide dual-storage architecture:
 * - SuperJournal: Full unabridged conversations
 * - Journal: Machine-trimmed compressed data
 */

import type { EventBus, StateBus, ConfigBus, ErrorBus } from '$lib/buses';
import { generateId } from '$lib/utils/generateId';

// Journal entry for machine-trimmed data
export interface JournalTrimEntry {
  id: string;
  conversationId: string;
  timestamp: number;
  turnNumber: number;
  trim: string; // "Boss: [message]\nSamara: [response]" format
  metadata: {
    hasDecisions: boolean;
    isInferable: boolean;
    priority: 'high' | 'medium' | 'low';
  };
}

interface JournalConfig {
  apiEndpoint: string;
  writeInterval: number;
  retryAttempts: number;
  retryDelay: number;
}

export class JournalBrick {
  private eventBus: EventBus;
  private stateBus: StateBus;
  private configBus: ConfigBus;
  private errorBus: ErrorBus;
  
  private config: JournalConfig;
  private conversationId: string;
  private writeQueue: JournalTrimEntry[] = [];
  private writeTimer: NodeJS.Timeout | null = null;
  
  constructor(
    eventBus: EventBus,
    stateBus: StateBus,
    configBus: ConfigBus,
    errorBus: ErrorBus
  ) {
    this.eventBus = eventBus;
    this.stateBus = stateBus;
    this.configBus = configBus;
    this.errorBus = errorBus;
    
    // Generate conversation ID for this browser session
    this.conversationId = generateId();
    
    // Default configuration
    this.config = {
      apiEndpoint: '/api/journal',
      writeInterval: 1000,    // Debounce writes by 1 second
      retryAttempts: 3,
      retryDelay: 2000
    };
    
    this.initialize();
  }
  
  private initialize(): void {
    console.log('📰 Journal: Initializing machine-trimmed memory system...');
    
    // Listen for completed message turns with machine trim data
    this.eventBus.subscribe('turn:completed', this.handleMessageTurnComplete.bind(this));
    
    // Update StateBus with initial state
    this.updateStateBus();
    
    console.log('📰 Journal: Machine-trimmed memory initialized. Conversation:', this.conversationId);
  }
  
  private async handleMessageTurnComplete(data: any): Promise<void> {
    try {
      // Extract the turn and machine trim data from the event
      const { turn, machineTrim } = data;
      
      if (!turn || !turn.bossMessage || !turn.samaraMessage) {
        console.warn('📰 Journal: Incomplete message pair, skipping');
        return;
      }
      
      if (!machineTrim || !machineTrim.trim || !machineTrim.metadata) {
        console.warn('📰 Journal: No machine trim data, skipping journal storage');
        return;
      }
      
      // Create journal entry
      const entry: JournalTrimEntry = {
        id: turn.id,
        conversationId: this.conversationId,
        timestamp: Date.now(),
        turnNumber: turn.turnNumber,
        trim: machineTrim.trim,
        metadata: {
          hasDecisions: machineTrim.metadata.hasDecisions || false,
          isInferable: machineTrim.metadata.isInferable || false,
          priority: machineTrim.metadata.priority || 'medium'
        }
      };
      
      // Add to write queue
      this.writeQueue.push(entry);
      
      // Debounced write to Journal R2
      this.scheduleWrite();
      
      console.log('📰 Journal: Captured trimmed turn', turn.turnNumber, 'Priority:', entry.metadata.priority);
      
    } catch (error) {
      this.errorBus.reportError(error as Error, 'JournalBrick', 'ERROR');
    }
  }
  
  private scheduleWrite(): void {
    // Clear existing timer
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
    
    // Schedule new write
    this.writeTimer = setTimeout(() => {
      this.flushWriteQueue();
    }, this.config.writeInterval);
  }
  
  private async flushWriteQueue(): Promise<void> {
    if (this.writeQueue.length === 0) return;
    
    // Take all entries from queue
    const entries = [...this.writeQueue];
    this.writeQueue = [];
    
    try {
      // Write each entry to Journal R2
      for (const entry of entries) {
        await this.writeToJournalR2(entry);
      }
      
      // Update StateBus after successful writes
      this.updateStateBus();
      
    } catch (error) {
      // Put failed entries back in queue for retry
      this.writeQueue.unshift(...entries);
      this.errorBus.reportError(error as Error, 'JournalBrick', 'ERROR');
      
      // Schedule retry
      setTimeout(() => this.scheduleWrite(), this.config.retryDelay);
    }
  }
  
  private async writeToJournalR2(entry: JournalTrimEntry): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.config.retryAttempts) {
      try {
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entry)
        });
        
        if (!response.ok) {
          throw new Error(`Journal R2 write failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Unknown journal write error');
        }
        
        console.log('📰 Journal: Written trim data to R2:', result.r2Key);
        return;
        
      } catch (error) {
        attempts++;
        console.error(`📰 Journal: Write attempt ${attempts} failed:`, error);
        
        if (attempts < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        } else {
          throw error;
        }
      }
    }
  }
  
  private updateStateBus(): void {
    this.stateBus.set('journal', {
      conversationId: this.conversationId,
      queuedWrites: this.writeQueue.length,
      lastWrite: Date.now()
    });
  }
  
  /**
   * Get current statistics
   */
  public getStats() {
    return {
      conversationId: this.conversationId,
      queuedWrites: this.writeQueue.length
    };
  }
  
  /**
   * Read from journal (for future use)
   */
  public async readConversation(conversationId?: string): Promise<any> {
    try {
      const id = conversationId || this.conversationId;
      const response = await fetch(`${this.config.apiEndpoint}/conversation/${id}`);
      
      if (!response.ok) {
        throw new Error(`Read failed: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      this.errorBus.reportError(error as Error, 'JournalBrick', 'ERROR');
      return null;
    }
  }
}