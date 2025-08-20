# BRICK-602-ThemeSelector Wire Documentation

## One Line
Manages theme selection state and publishes theme change events via StateBus and EventBus integration.

## Integration
```typescript
import { themeSelector } from '$lib/buses';
await themeSelector.selectTheme('rainy-night');
const current = themeSelector.getCurrentTheme();
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/buses/ThemeSelector/ folder
2. Remove themeSelector exports from apps/web/src/lib/buses/index.ts
3. Remove any 'theme:changed' event listeners in other components

Result: App continues working without theme selection. Components lose theme switching but ThemeRegistry still works for manual theme loading.

## Events

Publishes:
- theme:changed - When theme selection changes, payload: { name: string, theme: Theme }

Subscribes to:
- None - ThemeSelector only publishes events

## Config

None - ThemeSelector has no configuration file

## Dependencies

- StateBus (for current theme persistence via 'currentTheme' key)
- EventBus (for theme change notifications)
- ThemeRegistry (for theme data loading and validation)

## API

```typescript
themeSelector.selectTheme(name): Promise<void>        // Select and apply theme
themeSelector.getCurrentTheme(): string | null       // Get current theme name
themeSelector.getAvailableThemes(): Promise<string[]> // List available themes
themeSelector.hasTheme(name): Promise<boolean>       // Check if theme exists
themeSelector.clearSelection(): void                 // Clear current selection
```

## Testing

npm test -- ThemeSelector

## Notes

- Theme state persisted in StateBus with key 'currentTheme'
- Publishes 'theme:changed' events for other components to react
- Graceful error handling for missing themes
- Uses ThemeRegistry for theme validation and loading
- No direct DOM manipulation - purely state management