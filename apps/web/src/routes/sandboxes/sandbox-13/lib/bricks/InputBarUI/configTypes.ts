/**
 * InputBarUI Configuration Types
 * 
 * Module augmentation to extend the ConfigMap with InputBarUI's configuration keys.
 * Following Rule 4 (LEGO): Each brick declares its configuration dependencies.
 * 
 * This file registers all config keys that InputBarUI brick uses:
 * - dropdownData: The structured data for the 3 pickers (models, personas, themes)
 * - inputBarLayout: Layout and styling configuration
 * - inputBarBehavior: Behavior and interaction configuration
 * - fallbackMappings: Fallback display names before configs load
 */

import type { 
  InputBarConfig, 
  InputBarBehavior, 
  DropdownData, 
  FallbackMappings,
  RainyNightTheme,
  BTTConfig 
} from './core/types.js';

declare module '../../buses/ConfigBus/models/ConfigMap' {
  interface ConfigMap {
    // InputBarUI dropdown data - the main config causing the picker issue
    'dropdownData': DropdownData;
    
    // InputBarUI layout configuration
    'inputBarLayout': InputBarConfig;
    
    // InputBarUI behavior configuration  
    'inputBarBehavior': InputBarBehavior;
    
    // Fallback mappings for display names
    'fallbackMappings': FallbackMappings;
    
    // Theme configuration
    'themes/rainy-night': RainyNightTheme;
    
    // BetterTouchTool integration config
    'betterTouchTool': BTTConfig;
  }
}