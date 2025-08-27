/**
 * SuperJournal v2 - Main Orchestrator
 * Handles EventBus communication, retry queue, and discrete notifications
 */

import { v4 as uuidv4 } from 'uuid';
import { SUPERJOURNAL_EVENTS } from '../events/SuperJournalEvents';
import type { 
  MessagePairEntry,
  SuperJournalConfig,
  SaveResponse 
} from '../models/MessagePairEntry';
import type {
  SuperJournalSavedEvent,
  SuperJournalErrorEvent,
  SuperJournalRetryEvent,
  SuperJournalSyncRestoredEvent
} from '../events/SuperJournalEvents';

interface RetryQueueItem {
  entry: MessagePairEntry;
  attempts: number;
  nextRetryAt: number;
}

interface StreamingContext {
  sessionId: string;
  model: string;
  persona?: string;
  userMessage: string;
  assistantMessage: string;
  streamStartTime: number;
  userAgent: string;
}

export class SuperJournalBrick {
  private eventBus: EventTarget;
  private retryQueue: Map<string, RetryQueueItem> = new Map();
  private retryTimer: NodeJS.Timeout | null = null;
  private streamingContexts: Map<string, StreamingContext> = new Map();

  constructor(
    eventBus: EventTarget,
    config: SuperJournalConfig
  ) {
    this.eventBus = eventBus;
    // Note: Using API endpoints instead of direct R2 access
    this.initialize();
  }

  private initialize(): void {
    // Listen for turn completed events
    this.eventBus.subscribe(SUPERJOURNAL_EVENTS.TURN_COMPLETED, (data) => {
      this.handleTurnCompleted(data);
    });

    // Listen for message deletion events
    this.eventBus.subscribe(SUPERJOURNAL_EVENTS.MESSAGE_DELETED, (data) => {
      this.handleMessageDeleted(data);
    });

    // Listen for message restoration events  
    this.eventBus.subscribe(SUPERJOURNAL_EVENTS.MESSAGE_RESTORED, (data) => {
      this.handleMessageRestored(data);
    });

    // Start retry processor
    this.startRetryProcessor();
  }

  private handleTurnCompleted(data: any): void {
    const { 
      sessionId,
      model,
      persona,
      userMessage,
      assistantMessage,
      streamDuration,
      timestamp 
    } = data;

    // Create message pair entry
    const entry: MessagePairEntry = {
      id: uuidv4(),
      timestamp: timestamp || Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'active',
      userMessage,
      assistantMessage,
      metadata: {
        sessionId,
        model,
        persona,
        streamDuration,
        userAgent: navigator.userAgent,
        checksum: '' // Will be computed by R2StorageService
      }
    };

    // Save immediately
    this.saveEntry(entry);
  }

  private handleMessageDeleted(data: any): void {
    const { entryId } = data;
    this.updateEntryStatus(entryId, 'deleted');
  }

  private handleMessageRestored(data: any): void {
    const { entryId } = data;
    this.updateEntryStatus(entryId, 'active');
  }

  private async saveEntry(entry: MessagePairEntry): Promise<void> {
    try {
      // Use server-side API instead of direct R2 access
      const response = await fetch('/api/superjournal/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Publish success event
        this.publishSavedEvent({
          entryId: result.entryId,
          timestamp: result.timestamp,
          r2Key: result.r2Key
        });

        // Remove from retry queue if it was there
        this.retryQueue.delete(entry.id);
        
      } else {
        // Add to retry queue
        this.addToRetryQueue(entry);
        
        // Publish error event
        this.publishErrorEvent({
          entryId: entry.id,
          error: result.error || 'Unknown error',
          retryCount: 1,
          willRetry: true
        });
      }
    } catch (error) {
      // Add to retry queue
      this.addToRetryQueue(entry);
      
      // Publish error event
      this.publishErrorEvent({
        entryId: entry.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 1,
        willRetry: true
      });
    }
  }

  private async updateEntryStatus(entryId: string, newStatus: 'active' | 'deleted'): Promise<void> {
    try {
      const response = await fetch('/api/superjournal/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, status: newStatus })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.warn(`[SuperJournal] Failed to update entry ${entryId} status:`, result.error);
      }
    } catch (error) {
      console.error(`[SuperJournal] Error updating entry ${entryId} status:`, error);
    }
  }

  private addToRetryQueue(entry: MessagePairEntry, currentAttempts: number = 0): void {
    const retryItem: RetryQueueItem = {
      entry,
      attempts: currentAttempts,
      nextRetryAt: Date.now() + (2000 * Math.pow(2, currentAttempts)) // Exponential backoff
    };

    this.retryQueue.set(entry.id, retryItem);
  }

  private startRetryProcessor(): void {
    this.retryTimer = setInterval(async () => {
      const now = Date.now();
      const toRetry: RetryQueueItem[] = [];

      // Find items ready for retry
      for (const [entryId, item] of this.retryQueue.entries()) {
        if (now >= item.nextRetryAt) {
          if (item.attempts < 2) { // 0, 1, 2 = 3 total attempts
            toRetry.push(item);
          } else {
            // Max attempts reached, remove from queue
            this.retryQueue.delete(entryId);
            
            // Publish final error event
            this.publishErrorEvent({
              entryId,
              error: 'Max retry attempts exceeded',
              retryCount: item.attempts + 1,
              willRetry: false
            });
            
          }
        }
      }

      // Process retries
      for (const item of toRetry) {
        const newAttempts = item.attempts + 1;
        
        // Publish retry event
        this.publishRetryEvent({
          entryId: item.entry.id,
          attempt: newAttempts + 1,
          maxAttempts: 3
        });

        try {
          const response = await fetch('/api/superjournal/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.entry)
          });
          
          const result = await response.json();
          
          if (result.success) {
            // Success! Remove from queue
            this.retryQueue.delete(item.entry.id);
            
            // Publish success event
            this.publishSavedEvent({
              entryId: result.entryId,
              timestamp: result.timestamp,
              r2Key: result.r2Key
            });

            // Publish sync restored event
            this.publishSyncRestoredEvent({
              entryId: item.entry.id,
              retriesRequired: newAttempts
            });
            
          } else {
            // Failed, update retry item
            this.addToRetryQueue(item.entry, newAttempts);
            
            // Publish error event
            this.publishErrorEvent({
              entryId: item.entry.id,
              error: result.error || 'Unknown error',
              retryCount: newAttempts + 1,
              willRetry: newAttempts < 2
            });
          }
        } catch (error) {
          // Failed, update retry item
          this.addToRetryQueue(item.entry, newAttempts);
          
          // Publish error event
          this.publishErrorEvent({
            entryId: item.entry.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: newAttempts + 1,
            willRetry: newAttempts < 2
          });
        }
      }
    }, 1000); // Check every second
  }

  private publishSavedEvent(data: SuperJournalSavedEvent): void {
    this.eventBus.publish(SUPERJOURNAL_EVENTS.SAVED, data);
  }

  private publishErrorEvent(data: SuperJournalErrorEvent): void {
    this.eventBus.publish(SUPERJOURNAL_EVENTS.ERROR, data);
  }

  private publishRetryEvent(data: SuperJournalRetryEvent): void {
    this.eventBus.publish(SUPERJOURNAL_EVENTS.RETRY, data);
  }

  private publishSyncRestoredEvent(data: SuperJournalSyncRestoredEvent): void {
    this.eventBus.publish(SUPERJOURNAL_EVENTS.SYNC_RESTORED, data);
  }

  // Public API for reading entries
  async readEntries(query: any = {}) {
    const response = await fetch('/api/superjournal/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    return await response.json();
  }

  // Clean shutdown
  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryQueue.clear();
    this.streamingContexts.clear();
  }
}