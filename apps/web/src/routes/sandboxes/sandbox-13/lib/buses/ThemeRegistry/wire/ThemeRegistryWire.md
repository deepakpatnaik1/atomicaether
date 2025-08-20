# BRICK-601-ThemeRegistry Wire Documentation

## One Line
Discovers and loads theme JSON files from aetherVault/themes/ using DiscoveryBus for type-safe theme management.

## Integration
```typescript
import { themeRegistry } from '$lib/buses';
const themes = await themeRegistry.getThemes();
const theme = await themeRegistry.getTheme('rainy-night');
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/buses/ThemeRegistry/ folder
2. Remove themeRegistry exports from apps/web/src/lib/buses/index.ts
3. Remove symlinks: apps/web/src/themes and apps/web/static/themes
4. Delete aetherVault/themes/ directory (optional - contains theme content)

Result: App continues working without theme system. Components using theme properties will need fallback values.

## Events

Publishes:
- None - ThemeRegistry only provides data access

Subscribes to:
- None - ThemeRegistry is independent of events

## Config

None - ThemeRegistry has no configuration file

## Dependencies

- DiscoveryBus (for theme file discovery and loading)

## API

```typescript
themeRegistry.getThemes(): Promise<string[]>        // List available theme names
themeRegistry.getTheme(name): Promise<Theme>        // Load specific theme
themeRegistry.hasTheme(name): Promise<boolean>      // Check if theme exists
themeRegistry.clearCache(): void                    // Clear cached themes
```

## Testing

npm test -- ThemeRegistry

## Notes

- Uses dual symlink approach: src/themes/ for glob, static/themes/ for HTTP
- Absolute glob path '/src/themes/*.json' prevents caller-location issues
- Themes stored in aetherVault/themes/ as single source of truth
- Lazy loading with caching for performance
- Graceful error handling for missing themes