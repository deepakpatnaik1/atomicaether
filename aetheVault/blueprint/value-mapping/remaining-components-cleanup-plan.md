# Component Cleanup Plan - Remaining 381 Hardcoded Values

## Priority Order (Easiest → Hardest)

---

## 1. RecycleBinScrollback.svelte (78 values)
**Strategy: USE SHARED CLASSES - It's a duplicate of MessageScrollback!**

### Current Issues:
- Duplicates MessageScrollback styles entirely
- 78 values that are IDENTICAL to MessageScrollback

### Solution:
```svelte
<!-- BEFORE: Full duplicate styles -->
<div class="scrollback-container">...</div>

<!-- AFTER: Use shared classes -->
<div class="scrollback-container">
  <div class="messages-area">
    <span class="role-label role-label-boss">Boss</span>
    <div class="message-content">...</div>
    <div class="action-icons-group">
      <button class="icon-button">...</button>
    </div>
  </div>
</div>

<style>
  @import '$lib/../styles/shared.css';
  /* Only keep unique styles for recycle bin */
  .deleted-timestamp {
    font-size: var(--typography-font-size-tiny);
    color: var(--effects-opacity-muted);
  }
</style>
```
**Expected Reduction: 78 → ~5 values (94% reduction)**

---

## 2. MessageScrollback.svelte (87 values)
**Strategy: CONVERT TO SHARED CLASSES**

### Current Issues:
- All scrollback styling hardcoded
- Role labels defined locally
- Action icons defined locally

### Solution:
```svelte
<!-- Use shared classes from shared.css -->
<div class="scrollback-container">
  <div class="messages-area">
    {#each messages as message}
      <div class="message-turn">
        <span class="role-label role-label-{speaker}">...</span>
        <div class="message-content">...</div>
        <div class="action-icons-group">
          <button class="icon-button">...</button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  @import '$lib/../styles/shared.css';
  /* Component now has minimal custom styles */
</style>
```
**Expected Reduction: 87 → ~10 values (89% reduction)**

---

## 3. MarkdownRenderer.svelte (45 values)
**Strategy: THEME VARIABLES FOR MARKDOWN STYLES**

### Current Issues:
- Hardcoded colors for code blocks (#007acc)
- Hardcoded spacing for paragraphs, lists
- Font weights and sizes scattered

### Solution:
Add to rainy-night.json:
```json
"markdown": {
  "link": {
    "color": "#007acc"
  },
  "code": {
    "background": "rgba(0, 0, 0, 0.3)",
    "borderRadius": "4px",
    "padding": "2px 4px",
    "fontSize": "0.9em"
  },
  "codeBlock": {
    "background": "rgba(0, 0, 0, 0.3)",
    "borderRadius": "6px",
    "padding": "12px"
  },
  "heading": {
    "h1": { "fontSize": "1.5em", "fontWeight": "600" },
    "h2": { "fontSize": "1.3em", "fontWeight": "600" },
    "h3": { "fontSize": "1.1em", "fontWeight": "600" }
  },
  "list": {
    "paddingLeft": "20px",
    "marginBottom": "8px"
  },
  "paragraph": {
    "marginBottom": "12px"
  }
}
```

Then in component:
```css
/* BEFORE */
.markdown a { color: #007acc; }

/* AFTER */
.markdown a { color: var(--markdown-link-color); }
```
**Expected Reduction: 45 → ~10 values (78% reduction)**

---

## 4. ThemePickerUI.svelte (47 values)
**Strategy: INTEGRATE WITH DROPDOWN THEME**

### Current Issues:
- Custom dropdown styling (duplicates theme dropdown)
- Hardcoded fonts and spacing

### Solution:
Reuse existing dropdown theme:
```svelte
<!-- Use dropdown theme from rainy-night.json -->
<style>
  .picker-menu {
    background: var(--dropdown-menu-background);
    backdrop-filter: var(--dropdown-menu-backdrop-filter);
    border: var(--dropdown-menu-border);
    border-radius: var(--dropdown-menu-border-radius);
    box-shadow: var(--dropdown-menu-shadow);
  }
  
  .picker-item {
    color: var(--dropdown-item-color);
    padding: var(--spacing-tiny) var(--spacing-small);
  }
  
  .picker-item:hover {
    background: var(--dropdown-item-background-hover);
  }
</style>
```
**Expected Reduction: 47 → ~15 values (68% reduction)**

---

## 5. InputBarUI.svelte (124 values) - THE BEAST
**Strategy: MAJOR REFACTOR WITH THEME INTEGRATION**

### Current Issues:
- Complex component with many states
- Mixes theme values with hardcoded
- Stencils, dropdowns, controls all mixed

### Solution Approach:

#### Phase 1: Extract Layout Values
```json
"inputBarLayout": {
  "container": {
    "minWidth": "705px",
    "maxWidth": "800px",
    "position": "fixed",
    "bottom": "20px",
    "left": "50%",
    "transform": "translateX(-50%)"
  },
  "stencils": {
    "width": "calc((100vw - 800px) / 2)",
    "height": "1.5px"
  },
  "textarea": {
    "minHeight": "24px",
    "maxHeight": "300px",
    "lineHeight": "1.2"
  }
}
```

#### Phase 2: Use Existing Theme Values
- Many values already in theme (dropdown, controlsRow, etc.)
- Reference those instead of hardcoding

#### Phase 3: Create Utility Classes
```css
.input-container {
  position: var(--input-bar-layout-container-position);
  bottom: var(--input-bar-layout-container-bottom);
  left: var(--input-bar-layout-container-left);
  transform: var(--input-bar-layout-container-transform);
}
```

**Expected Reduction: 124 → ~30 values (76% reduction)**

---

## Implementation Order & Impact

| Component | Current | Target | Reduction | Effort |
|-----------|---------|--------|-----------|--------|
| 1. RecycleBinScrollback | 78 | 5 | 93% | Low - Just use shared classes |
| 2. MessageScrollback | 87 | 10 | 89% | Low - Convert to shared classes |
| 3. MarkdownRenderer | 45 | 10 | 78% | Medium - Add markdown theme section |
| 4. ThemePickerUI | 47 | 15 | 68% | Medium - Reuse dropdown theme |
| 5. InputBarUI | 124 | 30 | 76% | High - Complex refactor |
| **TOTAL** | **381** | **70** | **82%** | |

---

## Quick Wins (Do First)
1. **RecycleBinScrollback + MessageScrollback**: These are duplicates! Converting both to shared classes eliminates 165 values in one go.
2. **MarkdownRenderer**: Clear semantic sections, easy to theme.

## Complex Tasks (Do Last)
1. **InputBarUI**: Most complex, many interconnected parts. Save for last when pattern is proven.

---

## Final State Goal
- **Before**: 437 hardcoded values
- **Already Done**: 48 values removed
- **This Plan**: 311 more values removed
- **Final**: ~70-80 values remaining (84% total reduction)

The remaining values would be truly component-specific things that don't make sense to theme.