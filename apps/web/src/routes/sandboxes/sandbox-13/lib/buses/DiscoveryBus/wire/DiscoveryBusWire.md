# DiscoveryBus Wire Documentation

## Integration Points

1. **apps/web/src/lib/buses/index.ts** - Bus initialization
2. **Any brick needing content discovery** - Register and use

## Removal Instructions (Rule 5)

To remove DiscoveryBus completely:
1. Delete the `apps/web/src/lib/buses/DiscoveryBus/` folder
2. Remove `discoveryBus` initialization from `apps/web/src/lib/buses/index.ts`
3. Each brick falls back to its own `import.meta.glob` calls

**Result**: Each brick handles its own content discovery. No cascading failures.

## Usage Examples

### Registering Content Types

```typescript
// In ThemeRegistry
const themeModules = import.meta.glob('/aetherVault/themes/*.json');
discoveryBus.register('themes', themeModules);

// In PersonaRegistry
const personaModules = import.meta.glob('/aetherVault/personas/*.json');
discoveryBus.register('personas', personaModules);
```

### Discovering and Loading Content

```typescript
// List all available themes
const themeIds = discoveryBus.list('themes');
console.log(themeIds); // ['rainy-night', 'nord', 'solarized-light']

// Load a specific theme
const theme = await discoveryBus.load<ThemeData>('themes', 'rainy-night');

// Check if content exists
if (discoveryBus.has('themes', 'custom-theme')) {
    const customTheme = await discoveryBus.load('themes', 'custom-theme');
}
```

### Cache Management

```typescript
// Clear cache for themes (useful for hot reload)
discoveryBus.clearCache('themes');

// Clear all caches
discoveryBus.clearCache();
```

## Events

**Publishes**: None - DiscoveryBus doesn't publish events

**Subscribes to**: None - DiscoveryBus is independent

## Dependencies

- None - DiscoveryBus has no dependencies on other buses

## Notes

- Content is discovered at build time using Vite's `import.meta.glob`
- Content is lazy-loaded (only when requested)
- Loaded content is cached to avoid re-importing
- IDs are extracted from filenames (e.g., `rainy-night.json` → `rainy-night`)