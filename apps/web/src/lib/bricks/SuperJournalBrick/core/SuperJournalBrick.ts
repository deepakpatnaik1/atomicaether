/**
 * SuperJournalBrick - Deep Memory System
 * 
 * The memory of everything. Subconscious memory from the beginning of time.
 * Captures and permanently stores every message pair in Cloudflare R2.
 * Cannot be deleted. Immutable. Forever.
 */

import type { EventBus, StateBus, ConfigBus, ErrorBus } from '$lib/buses';
import type { JournalEntry, JournalMetadata, SuperJournalConfig, WriteResponse } from './types';
import { generateId } from '$lib/utils/generateId';

export class SuperJournalBrick {
  private eventBus: EventBus;
  private stateBus: StateBus;
  private configBus: ConfigBus;
  private errorBus: ErrorBus;
  
  private config: SuperJournalConfig;
  private turnCounter: number = 0;
  private sessionId: string;
  private writeQueue: JournalEntry[] = [];
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
    
    // Generate session ID for this browser session
    this.sessionId = generateId();
    
    // Default configuration
    this.config = {
      apiEndpoint: '/api/superjournal',
      writeInterval: 1000,    // Debounce writes by 1 second
      retryAttempts: 3,
      retryDelay: 2000
    };
    
    this.initialize();
  }
  
  private initialize(): void {
    console.log('🧠 SuperJournal: Initializing deep memory system...');
    
    // Load any existing turn counter from manifest
    this.loadManifest();
    
    // Listen for completed message turns
    this.eventBus.subscribe('messageTurn:complete', this.handleMessageTurnComplete.bind(this));
    
    // Update StateBus with initial state
    this.updateStateBus();
    
    console.log('🧠 SuperJournal: Deep memory initialized. Session:', this.sessionId);
  }
  
  private async handleMessageTurnComplete(data: any): Promise<void> {
    try {
      // Extract message pair from the event
      const { bossMessage, samaraMessage, metadata = {} } = data;
      
      if (!bossMessage || !samaraMessage) {
        console.warn('🧠 SuperJournal: Incomplete message pair, skipping');
        return;
      }
      
      // Increment global turn counter
      this.turnCounter++;
      
      // Create journal entry
      const entry: JournalEntry = {
        id: generateId(),
        timestamp: Date.now(),
        turnNumber: this.turnCounter,
        bossMessage: bossMessage.content || bossMessage,
        samaraMessage: samaraMessage.content || samaraMessage,
        checksum: '',  // Will be computed server-side
        metadata: {
          sessionId: this.sessionId,
          model: metadata.model || this.configBus.get('llm')?.selectedModel,
          persona: metadata.persona || this.configBus.get('persona')?.selected,
          streamDuration: metadata.streamDuration,
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
      
      // Add to write queue
      this.writeQueue.push(entry);
      
      // Debounced write to R2
      this.scheduleWrite();
      
      console.log('🧠 SuperJournal: Captured turn', this.turnCounter);
      
    } catch (error) {
      this.errorBus.reportError(error as Error, 'SuperJournalBrick', 'CRITICAL');
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
      // Write each entry to R2
      for (const entry of entries) {
        await this.writeToR2(entry);
      }
      
      // Update StateBus after successful writes
      this.updateStateBus();
      
    } catch (error) {
      // Put failed entries back in queue for retry
      this.writeQueue.unshift(...entries);
      this.errorBus.reportError(error as Error, 'SuperJournalBrick', 'ERROR');
      
      // Schedule retry
      setTimeout(() => this.scheduleWrite(), this.config.retryDelay);
    }
  }
  
  private async writeToR2(entry: JournalEntry): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.config.retryAttempts) {
      try {
        const response = await fetch(`${this.config.apiEndpoint}/write`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entry)
        });
        
        if (!response.ok) {
          throw new Error(`R2 write failed: ${response.statusText}`);
        }
        
        const result: WriteResponse = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Unknown write error');
        }
        
        console.log('🧠 SuperJournal: Written to R2:', result.r2Key);
        return;
        
      } catch (error) {
        attempts++;
        console.error(`🧠 SuperJournal: Write attempt ${attempts} failed:`, error);
        
        if (attempts < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        } else {
          throw error;
        }
      }
    }
  }
  
  private async loadManifest(): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/manifest`);
      
      if (response.ok) {
        const manifest = await response.json();
        this.turnCounter = manifest.totalEntries || 0;
        console.log('🧠 SuperJournal: Loaded manifest, turn counter:', this.turnCounter);
      }
    } catch (error) {
      console.log('🧠 SuperJournal: No existing manifest, starting fresh');
    }
  }
  
  private updateStateBus(): void {
    this.stateBus.set('superJournal', {
      sessionId: this.sessionId,
      totalTurns: this.turnCounter,
      queuedWrites: this.writeQueue.length,
      lastWrite: Date.now()
    });
  }
  
  /**
   * Read from deep memory (read-only access)
   */
  public async read(query: any = {}): Promise<JournalEntry[]> {
    try {
      const params = new URLSearchParams(query);
      const response = await fetch(`${this.config.apiEndpoint}/read?${params}`);
      
      if (!response.ok) {
        throw new Error(`Read failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.entries;
      
    } catch (error) {
      this.errorBus.reportError(error as Error, 'SuperJournalBrick', 'ERROR');
      return [];
    }
  }
  
  /**
   * Get current statistics
   */
  public getStats() {
    return {
      sessionId: this.sessionId,
      totalTurns: this.turnCounter,
      queuedWrites: this.writeQueue.length
    };
  }
}