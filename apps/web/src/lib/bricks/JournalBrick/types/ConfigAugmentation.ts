/**
 * ConfigMap augmentation for JournalBrick
 */

import type { JournalConfig } from './JournalTypes';

declare module '$lib/buses/ConfigBus/models/ConfigMap' {
  interface ConfigMap {
    'JournalBrick': JournalConfig;
  }
}