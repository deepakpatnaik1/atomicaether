# BRICK-701-DemoRegistry Wire Documentation

## Removal Instructions (Rule 5)
To remove DemoRegistry completely:
1. Delete the `apps/web/src/lib/bricks/DemoRegistry/` folder
2. Remove `demoRegistry` export from any index files
3. Delete `aetherVault/config/demoRegistry.json`

**Result**: Individual demos continue working. No central catalog or discovery. DemoGallery would need alternative discovery method.

## Integration Points
- aetherVault/config/demoRegistry.json - Configuration file
- Uses Vite's import.meta.glob for discovery

## Events
**Publishes:**
- `demo:registered` - When a demo is discovered and registered
  - Payload: `{ demo: DemoEntry }`
- `demo:discovery:complete` - When discovery process completes
  - Payload: `{ count: number, timestamp: Date }`

**Subscribes to:** None

## Dependencies
- None (will use EventBus, ConfigBus, StateBus when available)

## API
```typescript
const registry = new DemoRegistry();
await registry.init();

// Discovery
await registry.discover();         // Find all demos
await registry.refresh();          // Re-scan for demos

// Retrieval
registry.getAll();                 // All demos
registry.getById(id);              // Single demo
registry.getBySeries(series);      // Demos in series
registry.getByStatus(status);      // By status

// Search & Filter
registry.search(query);            // Search demos
registry.filter(predicate);        // Custom filter

// Metadata
registry.getAllSeries();           // Unique series list
registry.getAllCategories();       // Unique categories
registry.getStats();               // Statistics

// Utilities
registry.sort(demos, field);       // Sort demos
registry.groupBy(field);           // Group demos
await registry.loadComponent(id);  // Lazy-load component

// State
registry.isInitialized();          // Check if ready
registry.getLastRefresh();         // Last scan time
```

## Configuration
The registry is configured via `aetherVault/config/demoRegistry.json`:
- `scanPaths` - Where to look for demos
- `metadataPattern` - Pattern to find metadata
- `autoRefresh` - Auto-refresh on changes
- `sorting` - Default sort options
- `grouping` - How to group demos
- `cache` - Caching settings
- `validation` - Metadata validation rules