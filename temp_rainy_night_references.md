# Rainy Night References Found

## Summary
Found **12 lines** across **9 files** with references to 'rainy-night.json' (excluding .py, .json, and .md files).

## Detailed List

### 1. apps/web/build-plugins/theme-injector.js **[COME BACK TO THIS]**
- **Line 18:** `resolve(process.cwd(), 'static/themes/rainy-night.json'),`
- **Line 19:** `resolve(process.cwd(), 'apps/web/static/themes/rainy-night.json'),`
- **Line 20:** `resolve(import.meta.dirname, '../static/themes/rainy-night.json')`
- **Line 38:** `throw new Error('Could not find rainy-night.json theme file');`

### 2. apps/web/scripts/inject-theme.js **[COME BACK TO THIS]**
- **Line 16:** `const themePath = resolve(__dirname, '../static/themes/rainy-night.json');`

### 3. apps/web/.svelte-kit/types/index.d.ts **[IGNORED]**
- **Line 26:** `export type Asset = "/config/app.json" | "/config/betterTouchTool.json" | "/config/demoPage.json" | "/config/dropdownData.json" | "/config/errorBus.json" | "/config/eventBus.json" | "/config/fallbackMappings.json" | "/config/inputBarBehavior.json" | "/config/inputBarLayout.json" | "/config/models.json" | "/config/scrollback.json" | "/config/textHandler.json" | "/config/themes/grim-outlook.json" | "/config/themes/rainy-night.json" | "/favicon.png" | "/themes/rainy-night.backup.json" | "/themes/rainy-night.json";`

### 4. apps/web/.svelte-kit/output/server/manifest.js **[IGNORED]**
- **Line 10:** `assets: new Set(["config/DualResponseBrick.json","config/DualResponseOrchestratorBrick.json","config/JournalBrick.json","config/MessageTurnBrick.json","config/ResponseRouterBrick.json","config/SynchronizedDeletionBrick.json","config/SystemPromptBrick.json","config/app.json","config/betterTouchTool.json","config/demoPage.json","config/dropdownData.json","config/errorBus.json","config/eventBus.json","config/fallbackMappings.json","config/inputBarBehavior.json","config/inputBarLayout.json","config/models.json","config/scrollback.json","config/textHandler.json","config/themes/rainy-night.json","favicon.png","themes/rainy-night.backup.json","themes/rainy-night.json"]),`

### 5. apps/web/.svelte-kit/output/server/manifest-full.js **[IGNORED]**
- **Line 10:** `assets: new Set(["config/DualResponseBrick.json","config/DualResponseOrchestratorBrick.json","config/JournalBrick.json","config/MessageTurnBrick.json","config/ResponseRouterBrick.json","config/SynchronizedDeletionBrick.json","config/SystemPromptBrick.json","config/app.json","config/betterTouchTool.json","config/demoPage.json","config/dropdownData.json","config/errorBus.json","config/eventBus.json","config/fallbackMappings.json","config/inputBarBehavior.json","config/inputBarLayout.json","config/models.json","config/scrollback.json","config/textHandler.json","config/themes/rainy-night.json","favicon.png","themes/rainy-night.backup.json","themes/rainy-night.json"]),`

### 6. apps/web/.svelte-kit/output/client/_app/immutable/nodes/2.27XegCtX.js **[IGNORED]**
- **Line 2:** [Long minified line containing rainy-night.json reference in bundled code]

### 7. apps/web/src/lib/components/ThemePickerUI/ThemePickerUI.svelte **[REMOVED]**
- **Line 161:** `/* Use dropdown theme from rainy-night.json */`

### 8. apps/web/src/lib/buses/DiscoveryBus/DiscoveryBus.test.ts **[COME BACK TO THIS]**
- **Line 60:** `'/aetherVault/themes/rainy-night.json': vi.fn(),`

### 9. apps/web/src/lib/buses/DiscoveryBus/core/DiscoveryBus.ts **[REMOVED - UPDATED TO GRIM-OUTLOOK]**
- **Line 139:** `* extractId('/aetherVault/themes/rainy-night.json') // 'rainy-night'`

## File Categories

### Critical Source Files (5 files):
1. `apps/web/build-plugins/theme-injector.js` - Build plugin with 4 references
2. `apps/web/scripts/inject-theme.js` - Theme injection script with 1 reference  
3. `apps/web/src/lib/components/ThemePickerUI/ThemePickerUI.svelte` - Component with CSS comment
4. `apps/web/src/lib/buses/DiscoveryBus/DiscoveryBus.test.ts` - Test file mock
5. `apps/web/src/lib/buses/DiscoveryBus/core/DiscoveryBus.ts` - Code comment example

### Generated Build Files (4 files):
6. `apps/web/.svelte-kit/types/index.d.ts` - TypeScript asset definitions
7. `apps/web/.svelte-kit/output/server/manifest.js` - Server manifest 
8. `apps/web/.svelte-kit/output/server/manifest-full.js` - Full server manifest
9. `apps/web/.svelte-kit/output/client/_app/immutable/nodes/2.27XegCtX.js` - Client bundle

## Notes
- Generated build files will likely auto-update when source references are removed
- Main focus should be on the 5 critical source files
- Build plugins are key files that need attention for theme system changes