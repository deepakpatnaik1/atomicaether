/**
 * SuperJournalBrick - Independent LEGO Component
 * Rule 4 Compliant: Single responsibility, standard connectors, complete independence
 * Rule 2 Compliant: EventBus-only communication
 * Rule 9 Compliant: Preserves existing functionality, adds new capability
 */

import type { EventBus, StateBus, ConfigBus, ErrorBus } from '$lib/buses/types';
import { R2Service } from '../services/R2Service';
import { 
  SUPERJOURNAL_EVENTS,
  turnToMessagePair,
  type TurnCompletedPayload,
  type SuperJournalSavedPayload,
  type SuperJournalErrorPayload
} from '../events/SuperJournalEvents';

interface SuperJournalState {
  isEnabled: boolean;
  totalSaved: number;
  lastSaveTimestamp: number | null;
  recentErrors: string[];
}

export class SuperJournalBrick {
  private r2Service: R2Service;
  private state: SuperJournalState = {
    isEnabled: true,
    totalSaved: 0,
    lastSaveTimestamp: null,
    recentErrors: []
  };

  constructor(
    private eventBus: EventBus,
    private stateBus: StateBus,
    private configBus: ConfigBus,
    private errorBus: ErrorBus
  ) {
    this.r2Service = new R2Service();
    this.initialize();
  }

  private initialize() {
    // Rule 4: Standard LEGO connector - EventBus subscription
    this.subscribeToEvents();
    
    // Rule 2: StateBus for state management
    this.publishState();
  }

  private subscribeToEvents() {
    // Rule 2: EventBus-only communication - no direct coupling
    this.eventBus.subscribe(SUPERJOURNAL_EVENTS.TURN_COMPLETED, (data: TurnCompletedPayload) => {
      this.handleTurnCompleted(data);
    });
  }

  private async handleTurnCompleted(data: TurnCompletedPayload) {
    if (!this.state.isEnabled) {
      return; // Graceful disable capability
    }

    try {
      // Rule 3: Thin transformation layer
      const entry = turnToMessagePair(data.turn);
      
      // Rule 3: Delegate to thin R2Service wrapper
      const r2Key = await this.r2Service.saveMessagePair(entry);
      
      // Update internal state
      this.state.totalSaved++;
      this.state.lastSaveTimestamp = Date.now();
      this.publishState();

      // Rule 2: Publish success event for other components
      const successPayload: SuperJournalSavedPayload = {
        entryId: entry.id,
        r2Key,
        timestamp: Date.now()
      };
      
      this.eventBus.publish(SUPERJOURNAL_EVENTS.SAVED, successPayload);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update error state
      this.state.recentErrors.unshift(errorMessage);
      if (this.state.recentErrors.length > 5) {
        this.state.recentErrors.pop();
      }
      this.publishState();

      // Rule 2: Publish error event
      const errorPayload: SuperJournalErrorPayload = {
        entryId: data.turn.id,
        error: errorMessage,
        timestamp: Date.now()
      };
      
      this.eventBus.publish(SUPERJOURNAL_EVENTS.ERROR, errorPayload);
      
      // Rule 2: Report to ErrorBus without breaking app
      this.errorBus.reportRecoverable(
        new Error(`SuperJournal save failed: ${errorMessage}`),
        'SuperJournalBrick'
      );
    }
  }

  private publishState() {
    // Rule 2: StateBus for loose state coupling
    this.stateBus.set('superJournal', this.state);
  }

  // Public API for external control (Rule 4: Complete independence)
  public enable() {
    this.state.isEnabled = true;
    this.publishState();
  }

  public disable() {
    this.state.isEnabled = false;
    this.publishState();
  }

  public getState(): SuperJournalState {
    return { ...this.state };
  }

  public clearErrors() {
    this.state.recentErrors = [];
    this.publishState();
  }
}