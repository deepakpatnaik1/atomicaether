/**
 * ConfigMap augmentation for ResponseRouterBrick
 */

import type { RoutingConfig } from './RoutingTypes';

declare module '$lib/buses/ConfigBus/models/ConfigMap' {
  interface ConfigMap {
    'ResponseRouterBrick': RoutingConfig;
  }
}