/**
 * ConfigMap augmentation for DualResponseBrick
 */

import type { DualResponseConfig } from './DualResponseTypes';

declare module '$lib/buses/ConfigBus/models/ConfigMap' {
  interface ConfigMap {
    'DualResponseBrick': DualResponseConfig;
  }
}