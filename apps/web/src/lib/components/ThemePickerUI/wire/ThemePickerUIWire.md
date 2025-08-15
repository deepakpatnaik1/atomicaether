# BRICK-604-ThemePickerUI Wire Documentation

## One Line
Compact dropdown component for theme selection that integrates with ThemeSelector and matches input bar styling.

## Integration
```svelte
<script>
  import { ThemePickerUI } from '$lib/components/ThemePickerUI';
</script>

<ThemePickerUI 
  compact={true} 
  on:themeSelected={(e) => console.log('Theme selected:', e.detail.theme)}
/>
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/components/ThemePickerUI/ folder
2. Remove ThemePickerUI imports from any components using it
3. Remove from input bar layout when integrated

Result: Input bar loses theme selection dropdown but continues functioning. Theme selection still available through other means.

## Events

Publishes:
- themeSelected - When user selects a theme, payload: { theme: string }
- dropdownToggled - When dropdown opens/closes, payload: { open: boolean }

Subscribes to:
- None - Component receives data through props and ThemeSelector integration

## Config

None - ThemePickerUI has no configuration file

## Dependencies

- ThemeSelector (for theme operations)
- Svelte (component framework)

## API

```svelte
<!-- Props -->
<ThemePickerUI 
  disabled={false}           // Disable dropdown interaction
  compact={true}             // Use compact styling for input bar
  placeholder="Theme"        // Text shown when no theme selected
  on:themeSelected={handler} // Theme selection event
  on:dropdownToggled={handler} // Dropdown state change event
/>
```

## Testing

npm test -- ThemePickerUI
Manual testing via /demo/brick-604

## Notes

- Styled to match input bar dropdown components (model/persona)
- Keyboard accessible (arrow keys, enter, escape)
- Click-outside-to-close behavior
- Uses CSS custom properties for theming (self-theming!)
- Visual feedback for selected theme
- Clear selection option when theme is selected
- Loading and error states handled gracefully
- SSR-safe with proper hydration
- Focus management for accessibility
- ARIA attributes for screen readers