/**
 * SuperJournal v2 - Main Export
 * LEGO brick for message pair persistence to R2
 */

export { SuperJournalBrick } from './core/SuperJournalBrick';
export { R2StorageService } from './services/R2StorageService';
export { SUPERJOURNAL_EVENTS } from './events/SuperJournalEvents';

export type {
  MessagePairEntry,
  MessagePairMetadata,
  SuperJournalConfig,
  SaveResponse,
  ReadQuery,
  ReadResponse
} from './models/MessagePairEntry';

export type {
  SuperJournalSavedEvent,
  SuperJournalErrorEvent,
  SuperJournalRetryEvent,
  SuperJournalSyncRestoredEvent,
  SuperJournalStatusUpdatedEvent
} from './events/SuperJournalEvents';