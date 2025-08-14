# BRICK-704-DemoTemplate Documentation

## One Line
CLI template generator that creates consistent demo boilerplate for testing bricks in isolation.

## Integration
```bash
npm run create-demo <brick-name>
```
or programmatically:
```typescript
import { DemoTemplate } from '$lib/bricks/DemoTemplate';
const template = new DemoTemplate();
await template.init();
const code = template.generateDemoComponent(options);
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/bricks/DemoTemplate/ folder
2. Remove "create-demo" script from apps/web/package.json
3. Delete aetherVault/config/demoTemplate.json

Result: Existing demos continue working. Cannot generate new demos via CLI.

## Events

Publishes:
  - None currently (will publish demo:created when EventBus is available)

Subscribes to:
  - None

## Config

aetherVault/config/demoTemplate.json
```json
{
    "outputPath": "src/routes/demo/{name}",  // Where demos are created
    "templateSections": {                     // Which sections to include
        "actions": true,
        "state": true,
        "output": true,
        "debug": true,
        "reset": true
    },
    "defaultMetadata": {                      // Default demo metadata
        "series": "000s",
        "status": "wip",
        "category": "uncategorized"
    }
}
```

## Dependencies

  - None (temporarily loads config via fetch until ConfigBus is available)

## API

```typescript
template.init(): Promise<void>                          // Initialize with config
template.generateDemoComponent(options): string         // Generate demo code
template.getOutputPath(name): string                    // Get demo file path
```

## Testing

```bash
# Test CLI generation
npm run create-demo test-feature

# Visit demo of the generator itself
http://localhost:5173/demo/demo-template
```

## Notes

- CLI script is standalone JavaScript to avoid TypeScript compilation issues
- Generated demos include TODO comments where implementation is needed
- Each demo gets metadata for future discovery by DemoRegistry
- The demo-template demo is meta - it demos the demo generator itself

---

# BRICK-703-DemoGallery Documentation

## One Line
Beautiful card-based gallery UI for browsing and filtering all discovered demos.

## Integration
```typescript
// Use as standalone Svelte component
import DemoGallery from '$lib/bricks/DemoGallery/core/DemoGallery.svelte';

// In your route
<DemoGallery />
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/bricks/DemoGallery/ folder
2. Remove /demo route that uses DemoGallery
3. Delete aetherVault/config/demoGallery.json

Result: Individual demos continue working. No gallery UI. Would need alternative navigation method.

## Events

Publishes:
  - demo:selected - When user clicks a demo card, payload: { demoId: string }
  - gallery:filtered - When filters change, payload: { filteredCount: number }

Subscribes to:
  - None currently (will subscribe to demo:registered from DemoRegistry)

## Config

aetherVault/config/demoGallery.json
```json
{
    "layout": {
        "cardsPerRow": "auto-fill",      // Grid layout
        "minCardWidth": "280px",          // Minimum card size
        "gap": "1rem"                     // Space between cards
    },
    "features": {
        "showStats": true,                // Stats bar at top
        "showFilters": true,              // Filter controls
        "groupBySeries": true,            // Group demos by series
        "showBrokenDemos": false          // Hide broken demos
    },
    "styling": {
        "cardStyle": "elevated",          // Card appearance
        "animations": true,               // Hover effects
        "seriesColors": {                 // Series color coding
            "700s": "#f97316"
        }
    }
}
```

## Dependencies

  - BRICK-701-DemoRegistry - For discovering and fetching demos
  - Will integrate with EventBus when available

## API

Component props:
```typescript
// DemoGallery.svelte accepts no props - fully config-driven
```

Subcomponents:
- DemoCard.svelte - Individual demo card
- FilterBar.svelte - Search and filter controls  
- StatsBar.svelte - Statistics display

## Testing

```bash
# Visit the gallery
http://localhost:5173/demo

# Test filtering, search, responsive layout
```

## Notes

- Responsive grid layout adapts to screen size
- Search works across name, description, tags, and proves
- Cards show status badges with emojis
- Series are color-coded for visual grouping
- The gallery itself appears as a demo (meta-recursive)

---

# BRICK-701-DemoRegistry Documentation

## One Line
Auto-discovers and catalogs all demos using Vite's import.meta.glob with metadata extraction.

## Integration
```typescript
import { DemoRegistry } from '$lib/bricks/DemoRegistry';
const registry = new DemoRegistry();
await registry.init();
const demos = registry.getAll();
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/bricks/DemoRegistry/ folder
2. Remove any imports/exports of DemoRegistry
3. Delete aetherVault/config/demoRegistry.json

Result: Individual demos continue working. No central catalog or discovery. DemoGallery would need alternative discovery method.

## Events

Publishes:
  - demo:registered - When a demo is discovered, payload: { demo: DemoEntry }
  - demo:discovery:complete - When discovery completes, payload: { count: number }

Subscribes to:
  - None

## Config

aetherVault/config/demoRegistry.json
```json
{
    "scanPaths": ["/src/routes/demo/*/+page.svelte"],  // Where to find demos
    "metadataPattern": "<!-- demo-meta:",               // Metadata marker
    "sorting": { "default": "series" },                 // Sort options
    "grouping": { "enabled": true, "by": "series" },    // Grouping
    "validation": {                                     // Metadata validation
        "requireMetadata": true,
        "requiredFields": ["name", "series", "category"]
    }
}
```

## Dependencies

  - None (will integrate with EventBus, ConfigBus, StateBus when available)

## API

```typescript
// Discovery
registry.discover(): Promise<void>              // Find all demos
registry.refresh(): Promise<void>               // Re-scan

// Retrieval  
registry.getAll(): DemoEntry[]                  // All demos
registry.getById(id): DemoEntry | undefined     // Single demo
registry.getBySeries(series): DemoEntry[]       // By series
registry.getByStatus(status): DemoEntry[]       // By status

// Search & Filter
registry.search(query): DemoEntry[]             // Search demos
registry.filter(predicate): DemoEntry[]         // Custom filter

// Metadata
registry.getAllSeries(): string[]               // Unique series
registry.getAllCategories(): string[]           // Unique categories
registry.getStats(): DemoStats                  // Statistics

// Component Loading
registry.loadComponent(id): Promise<any>        // Lazy-load demo
```

## Testing

```bash
# Visit the registry demo
http://localhost:5173/demo/demo-registry

# See it discover all demos, search, filter, and show stats
```

## Notes

- Uses Vite's import.meta.glob for build-time discovery
- Extracts metadata from <!-- demo-meta: {...} --> comments
- Provides comprehensive search, filter, and statistics
- Lazy-loads demo components only when needed
- The demo shows real discovery of all existing demos