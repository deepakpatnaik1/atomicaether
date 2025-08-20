# BRICK-603-ThemeApplier Wire Documentation

## One Line
Subscribes to theme change events and applies theme properties as CSS custom properties on document root.

## Integration
```typescript
import { themeApplier } from '$lib/buses';
themeApplier.initialize(); // Start listening for theme changes
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/buses/ThemeApplier/ folder
2. Remove themeApplier exports from apps/web/src/lib/buses/index.ts
3. Remove themeApplier.initialize() calls from app initialization

Result: Theme selection still works but themes won't apply visually. Components lose CSS custom properties but app continues functioning.

## Events

Publishes:
- None - ThemeApplier only applies themes

Subscribes to:
- theme:changed - Applies theme properties as CSS custom properties when themes change

## Config

None - ThemeApplier has no configuration file

## Dependencies

- EventBus (for theme change event subscription)

## API

```typescript
themeApplier.initialize(): void                    // Start listening for theme changes
themeApplier.applyTheme(theme): void              // Manually apply theme (usually automatic)
themeApplier.clearTheme(): void                   // Remove all theme CSS properties
themeApplier.destroy(): void                      // Stop listening and clean up
themeApplier.getCurrentProperty(cssVar): string   // Get current CSS property value
```

## Testing

npm test -- ThemeApplier

## Notes

- Maps theme JSON properties to CSS custom properties (appBackground → --app-background)
- SSR-safe with document checks
- Automatically applies themes when ThemeSelector publishes changes
- CSS custom properties available to all components via var(--app-background)
- Property mapping will grow organically as themes expand
- Initialize once in app startup, then works automatically
- Browser DevTools: Inspect :root element to see applied CSS custom properties