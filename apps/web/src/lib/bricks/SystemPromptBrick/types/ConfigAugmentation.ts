/**
 * ConfigMap augmentation for SystemPromptBrick
 */

import type { SystemPromptConfig } from './SystemPromptTypes';

declare module '$lib/buses/ConfigBus/models/ConfigMap' {
  interface ConfigMap {
    'SystemPromptBrick': SystemPromptConfig;
  }
}