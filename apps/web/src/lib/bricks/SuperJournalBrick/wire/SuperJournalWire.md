# SuperJournalBrick Wire Documentation

**Rule 5 Compliance: Easy Removal - Delete Without Fear**

## What This Brick Does
- Automatically saves message pairs (user questions + AI responses) to Cloudflare R2 storage
- Listens to `turn:completed` events from MessageTurnBrick
- Stores data in date-organized structure: `entries/YYYY/MM/DD/entry-id.json`
- Publishes `superjournal:saved` and `superjournal:error` events

## Connections (Standard LEGO Connectors)
- **EventBus**: Subscribes to `turn:completed`, publishes save events
- **StateBus**: Manages SuperJournal state (total saved, errors, etc.)
- **ConfigBus**: Uses environment variables for R2 configuration
- **ErrorBus**: Reports recoverable errors without breaking app

## Dependencies
- **External**: AWS S3 SDK (`@aws-sdk/client-s3`)
- **Environment**: R2 credentials via `VITE_R2_*` variables
- **Internal**: Bus types only (no direct brick coupling)

## Easy Removal Process (Under 5 Steps)

### Step 1: Delete SuperJournalBrick Directory
```bash
rm -rf src/lib/bricks/SuperJournalBrick/
```

### Step 2: Remove Import from +page.svelte
```typescript
// DELETE this line:
import { SuperJournalBrick } from '$lib/bricks/SuperJournalBrick/core/SuperJournalBrick';
```

### Step 3: Remove Initialization from +page.svelte
```typescript
// DELETE these lines:
let superJournalBrick;
superJournalBrick = new SuperJournalBrick(eventBus, stateBus, configBus, errorBus);
```

### Step 4: Clean Dependencies (Optional)
```bash
# Remove AWS S3 SDK if not used elsewhere
npm uninstall @aws-sdk/client-s3
```

### Step 5: Clean Environment Variables (Optional)
```bash
# Remove from .env if desired
# VITE_R2_SUPERJOURNAL_BUCKET=...
```

## Removal Validation
- ✅ No TypeScript compilation errors
- ✅ No runtime crashes
- ✅ All existing features continue working
- ✅ MessageTurnBrick continues publishing events normally
- ✅ App functions identically except no message persistence

## Functionality Lost After Removal
- **Message Pair Persistence**: Conversation history not saved to R2
- **SuperJournal Events**: No more `superjournal:saved` events
- **Historical Data**: No automatic backup of conversations

## App Degradation (Graceful)
- **Runtime Stability**: No crashes or errors
- **Core Features**: All conversation functionality intact
- **UI/UX**: No visible changes to user experience
- **Performance**: Slightly faster (no R2 save operations)

## Restoration
To restore SuperJournal functionality:
1. Re-add the SuperJournalBrick directory
2. Re-add imports and initialization
3. Ensure R2 environment variables are set
4. Restart dev server

## Testing Removal
```bash
# Test removal process
git checkout -b test-removal
rm -rf src/lib/bricks/SuperJournalBrick/
# Remove imports from +page.svelte
npm run dev
# Verify app works normally
git checkout main  # Restore
```

## Integration Notes
- **Zero Coupling**: Other components unaware of SuperJournalBrick
- **Event-Driven**: All communication via EventBus
- **Stateless**: Removal doesn't affect application state
- **Idempotent**: Can be added/removed multiple times safely

This brick follows perfect LEGO principles: easily removable with predictable, graceful degradation.