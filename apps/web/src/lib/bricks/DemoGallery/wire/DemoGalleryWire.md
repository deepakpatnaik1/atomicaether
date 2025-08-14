# BRICK-703-DemoGallery Wire Documentation

## Removal Instructions (Rule 5)
To remove DemoGallery completely:
1. Delete the `apps/web/src/lib/bricks/DemoGallery/` folder
2. Update `/src/routes/demo/+page.svelte` to use alternative UI
3. Delete `aetherVault/config/demoGallery.json`

**Result**: Individual demos still accessible via direct URLs. DemoRegistry still works. Need alternative UI to browse demos.

## Integration Points
- `/src/routes/demo/+page.svelte` - Main gallery page
- `aetherVault/config/demoGallery.json` - UI configuration

## Events
**Publishes:**
- `gallery:filter:changed` - When filters are updated
  - Payload: `{ filters: FilterState }`
- `gallery:demo:selected` - When a demo card is clicked
  - Payload: `{ demo: DemoEntry }`

**Subscribes to:**
- `demo:registered` - To update when new demos discovered

## Dependencies
- DemoRegistry - For demo discovery and data
- None other (UI component)

## API
The DemoGallery is a Svelte component, not a class:
```svelte
<DemoGallery />
```

Props accepted by sub-components:
- DemoCard: `demo`, `seriesColor`, `cardStyle`, `animations`
- FilterBar: `searchQuery`, `selectedSeries`, `selectedStatus`, etc.
- StatsBar: `stats`, `filteredCount`, `totalCount`

## Configuration
Gallery UI is configured via `aetherVault/config/demoGallery.json`:
- `layout` - Grid layout settings
- `features` - Which UI features to show
- `styling` - Visual appearance options
- `routing` - URL paths
- `text` - UI text strings