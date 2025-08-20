# Field Report

## Lesson #3: Drag & Drop Opens New Tabs Despite Event Prevention

### 🚨 Symptoms (How to recognize this problem)
- Drag and drop works functionally (files appear in preview area)
- Console logs show correct behavior: "🎯 Drop event detected", "📁 Files dropped: X"  
- Files save to localStorage successfully
- **BUT** browser still opens dropped files in new tabs showing random screenshots/content
- User sees both the intended behavior AND unwanted new tab opening
- Multiple `event.preventDefault()` calls in drag handlers don't stop the new tab behavior

### 🔍 Root Cause
Browser's native drag-and-drop behavior runs in parallel with custom event handlers. Even when custom handlers call `event.preventDefault()`, the browser's default "open file in new tab" behavior can still execute because:

1. **Event propagation timing** - Global window events may fire before/after local element handlers
2. **Multiple event targets** - Drop events can fire on child elements (textarea) not just the intended drop zone
3. **Insufficient event stopping** - `preventDefault()` and `stopPropagation()` alone don't stop immediate propagation to other handlers

### ✅ Solution
**Three-layer event prevention approach:**

1. **Global browser default prevention:**
   ```html
   <svelte:window 
     on:dragover|preventDefault
     on:drop|preventDefault
   />
   ```

2. **Complete local event stopping:**
   ```javascript
   async function handleDrop(event: DragEvent) {
     event.preventDefault();
     event.stopPropagation();
     event.stopImmediatePropagation(); // KEY: stops all other handlers
     // ... handle files
     return false; // Extra insurance
   }
   ```

3. **All drag event handlers on drop zone:**
   ```html
   <div 
     on:dragenter={handleDragEnter}
     on:dragover={handleDragOver}  
     on:dragleave={handleDragLeave}
     on:drop={handleDrop}
   >
   ```

### 🎯 Prevention
- **Use `stopImmediatePropagation()`** in custom drop handlers to prevent other handlers from executing
- **Always combine global and local prevention** - global blocks default browser behavior, local handles specific functionality
- **Handle all drag events** (`dragenter`, `dragover`, `dragleave`, `drop`) not just `drop`
- **Test both scenarios**: files dropped on intended target AND files dropped elsewhere on page
- **Return false** from event handlers as additional prevention insurance
- **Use `|preventDefault` modifier** in Svelte for simple global prevention

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
