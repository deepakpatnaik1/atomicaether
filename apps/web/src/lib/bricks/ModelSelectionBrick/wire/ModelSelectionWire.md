# ModelSelectionBrick Wire Documentation

## One Line
Handles model selection persistence across browser sessions using localStorage with validation against available models.

## Integration

```typescript
// In main app initialization
import { ModelSelectionBrick } from '$lib/bricks/ModelSelectionBrick/core/ModelSelectionBrick';

const modelSelectionBrick = new ModelSelectionBrick(eventBus, configBus, stateBus, errorBus);
```

## Removal Instructions (Rule 5)

To remove ModelSelectionBrick completely:

1. Delete the ModelSelectionBrick/ folder:
   ```bash
   rm -rf apps/web/src/lib/bricks/ModelSelectionBrick
   ```

2. Remove initialization from main app:
   ```typescript
   // Remove these lines from +page.svelte
   import { ModelSelectionBrick } from '$lib/bricks/ModelSelectionBrick/core/ModelSelectionBrick';
   const modelSelectionBrick = new ModelSelectionBrick(eventBus, configBus, stateBus, errorBus);
   ```

3. Update InputBarUI to handle model selection internally:
   ```typescript
   // In InputBarUI, change selectModel() to handle persistence directly
   function selectModel(model: string) {
     selectedModel = model;
     localStorage.setItem('selectedModel', model); // Add this line
     showModelDropdown = false;
     focusInputBar();
   }
   ```

**Result**: App works perfectly. Model selection no longer persists across browser refreshes - will revert to hardcoded default.

## Events

**Publishes:**
- `model:selected` - When model selection changes, payload: `{ model: string }`

**Subscribes to:**
- `model:select` - UI requests model change, payload: `{ model: string }`

## Dependencies

- EventBus (communication)
- ConfigBus (loads dropdownData.json)
- StateBus (shares current selection)
- ErrorBus (error reporting)
- localStorage (persistence)

## Storage

**Key**: `'selectedModel'`
**Value**: Selected model ID string (e.g., `'claude-sonnet-4-20250514'`)
**Fallback**: `dropdownData.defaults.selectedModel` from config

## Validation

Model selections are validated against `dropdownData.models` configuration. Invalid models fall back to config default.

## API

```typescript
modelSelectionBrick.getCurrentModel(): string | null
modelSelectionBrick.selectModel(model: string): void
modelSelectionBrick.clearPersistedSelection(): void // For testing/reset
```

## Integration Points

- **Main App**: Brick initialization
- **InputBarUI**: Publishes `model:select` events
- **Config**: Requires `dropdownData.json` with models and defaults
- **StateBus**: Stores current selection at key `'selectedModel'`

## Testing

1. Select a model in UI
2. Refresh browser
3. Verify same model is selected
4. Test with invalid stored model (should fallback to default)
5. Test with missing config (should use hardcoded fallback)

## Benefits

- **Persistence**: Model selection survives browser refresh
- **Validation**: Invalid selections gracefully fall back to defaults
- **Decoupling**: InputBar remains pure UI, business logic isolated
- **Standard**: Follows LEGO brick pattern with four-bus architecture