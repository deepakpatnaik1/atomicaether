# Field Report

## Lesson #2: UI Component Appears Broken But Is Just Invisible Text

### 🚨 Symptoms (How to recognize this problem)
- Component dropdowns appear to show "nothing" when clicked
- Console logs show data loading successfully: `Array [ "rainy-night" ]` and `themes.length: 1`
- Event handlers fire correctly: `Dropdown toggled: true/false` 
- Component functionality works (opens/closes) but content seems missing
- User reports "When I click on them, nothing happens" but actually means "I can't see what's there"
- Dropdown menu renders (gray box appears) but text is nearly invisible

### 🔍 Root Cause
CSS color contrast issue where text color is too similar to background color. In this case:
```css
/* Problem: dark gray text on light gray background */
color: var(--text-color, #333);  /* Falls back to #333 (dark gray) */
background: var(--surface-background, white); /* Light gray dropdown */
```

The text was rendering correctly but with insufficient contrast to be readable, making it appear as if the component was broken when it was actually working perfectly.

### ✅ Solution
Improve text contrast by using a more visible color:

```css
/* Before: nearly invisible */
color: var(--text-color, #333);

/* After: clearly visible */
color: white;
```

Alternative solutions:
- Use high-contrast color combinations
- Test CSS custom property fallbacks for readability
- Ensure adequate contrast ratios (WCAG guidelines recommend 4.5:1 minimum)

### 🎯 Prevention
- **Always test color contrast** when using CSS custom properties with fallbacks
- **Look closely at UI elements** before assuming they're functionally broken
- **Check WCAG contrast ratios** during development (use browser dev tools accessibility panel)
- **Question "nothing appears"** - verify if content is truly missing vs. just invisible
- **Test fallback colors** in isolation to ensure they work without custom properties
- **Consider both dark and light theme scenarios** when setting fallback colors

## Lesson #1: import.meta.glob Not Finding Files in Static Directory

### 🚨 Symptoms (How to recognize this problem)
- `import.meta.glob()` returns empty array `[]` despite files existing
- Files are accessible via HTTP: `curl http://localhost:5174/themes/file.json` works ✅
- Files exist in filesystem: `ls static/themes/` shows files ✅
- Console shows: "Available Themes (0)" but themes directory has files
- DiscoveryBus returns empty list from `discoveryBus.list('themes')`
- Browser console logs: `Object.keys(globModules) = []`

### 🔍 Root Cause
`import.meta.glob` only works for files within the `src/` directory tree. Files in `static/` directory are served by Vite for HTTP access but are not accessible to build-time glob patterns. Additionally, glob paths resolve relative to the calling file's location, not the project root.

### ✅ Solution
Implement **dual location approach** with symlinks:

1. **Create symlink in src for glob access:**
   ```bash
   cd apps/web/src
   ln -sf ../../../aetherVault/themes themes
   ```

2. **Keep existing symlink in static for HTTP access:**
   ```bash
   cd apps/web/static
   ln -sf ../../../aetherVault/themes themes
   ```

3. **Use absolute glob pattern in code:**
   ```typescript
   // ❌ Fails - relative path depends on caller location
   const modules = import.meta.glob('../themes/*.json');

   // ✅ Works - absolute path always resolves correctly
   const modules = import.meta.glob('/src/themes/*.json');
   ```

4. **Verify both access methods work:**
   - Glob: `Object.keys(import.meta.glob('/src/themes/*.json'))` returns file paths
   - HTTP: `curl http://localhost:5174/themes/file.json` returns file content

### 🎯 Prevention
- **Always use absolute paths** with `import.meta.glob()` to avoid caller-location dependencies
- **Test glob patterns** by logging `Object.keys(modules)` before assuming they work
- **Remember**: `static/` is for HTTP serving, `src/` is for build-time processing
- **Use symlinks** to maintain single source of truth while satisfying both access methods
- **Document the dual-location pattern** so others understand why both symlinks exist
