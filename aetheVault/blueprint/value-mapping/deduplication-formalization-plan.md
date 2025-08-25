# Deduplication & Formalization Plan
## Objective: Eliminate 437 hardcoded values → Clean theme-driven system

---

## PHASE 1: Core Theme Structure
### Add to rainy-night.json

```json
{
  "spacing": {
    "0": "0",
    "micro": "4px",
    "tiny": "6px", 
    "small": "8px",
    "compact": "12px",
    "medium": "16px",
    "standard": "20px",
    "large": "32px",
    "xlarge": "80px"
  },
  
  "layout": {
    "reset": {
      "margin": "0",
      "padding": "0"
    },
    "flex": {
      "center": {
        "display": "flex",
        "alignItems": "center",
        "justifyContent": "center"
      },
      "column": {
        "display": "flex",
        "flexDirection": "column"
      },
      "spaceBetween": {
        "display": "flex",
        "justifyContent": "space-between"
      }
    },
    "position": {
      "relative": "relative",
      "absolute": "absolute",
      "fixed": "fixed"
    }
  },
  
  "icons": {
    "container": {
      "size": "32px",
      "display": "flex",
      "alignItems": "center",
      "justifyContent": "center",
      "background": "transparent",
      "border": "none",
      "borderRadius": "50%",
      "color": "rgba(255, 255, 255, 0.6)",
      "transition": "all 0.2s ease"
    },
    "svg": {
      "size": "16px",
      "strokeLinecap": "round",
      "strokeLinejoin": "round"
    },
    "hover": {
      "color": "rgba(255, 255, 255, 0.95)",
      "background": "rgba(255, 255, 255, 0.1)",
      "transform": "scale(1.05)"
    },
    "active": {
      "transform": "scale(0.95)"
    }
  },
  
  "effects": {
    "transition": {
      "quick": "all 0.2s ease",
      "default": "all 0.3s ease"
    },
    "transform": {
      "scaleUp": "scale(1.05)",
      "scaleDown": "scale(0.95)"
    },
    "backdrop": {
      "blur": "blur(10px)"
    }
  }
}
```

---

## PHASE 2: Create Shared CSS Classes
### New file: `/apps/web/src/styles/shared.css`

```css
/* REUSABLE LAYOUT CLASSES - Used 95 times! */
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

.position-relative {
  position: relative;
}

.position-absolute {
  position: absolute;
}

/* REUSABLE ICON CLASSES - Used 50+ times */
.icon-button {
  width: var(--icons-container-size);
  height: var(--icons-container-size);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--icons-container-color);
  transition: var(--effects-transition-quick);
  cursor: pointer;
}

.icon-button:hover {
  color: var(--icons-hover-color);
  background: var(--icons-hover-background);
  transform: var(--icons-hover-transform);
}

.icon-button:active {
  transform: var(--icons-active-transform);
}

.icon-button svg {
  width: var(--icons-svg-size);
  height: var(--icons-svg-size);
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* REUSABLE SPACING CLASSES */
.reset {
  margin: 0;
  padding: 0;
}

/* SCROLLBACK CONTAINER - Used in 3 components */
.scrollback-base {
  height: calc(100vh - 114px);
  width: 650px;
  max-width: calc(100vw - 40px);
  margin: 0 auto;
  overflow-y: auto;
  overflow-x: hidden;
  background: transparent;
}

@media (min-width: 705px) {
  .scrollback-base {
    width: 800px;
  }
}

/* MESSAGE CONTENT - Used in 2 components */
.message-content-base {
  margin-left: 19px;
  color: #DFD0B8;
  font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

/* ROLE LABELS - Used in 2 components */
.role-label-base {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 4px;
  display: inline-block;
  border: 1px solid;
}

.role-label-boss {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
}

.role-label-samara {
  color: #f97316;
  background: rgba(249, 115, 22, 0.2);
  border-color: rgba(249, 115, 22, 0.3);
}

/* ACTION ICONS GROUP - Used in 2 components */
.action-icons-group {
  position: absolute;
  bottom: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: fadeIn 0.2s ease-out;
  transform: translateY(4px);
}
```

---

## PHASE 3: Component Updates

### Example: Update `+page.svelte`
**BEFORE (28 hardcoded values):**
```svelte
<style>
  :global(body) {
    background: var(--app-background, #222831) !important;
    color: var(--text-color, #e0e0e0) !important;
    transition: all 0.3s ease;
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  
  .recycle-bin-icon {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    transition: all 0.2s ease;
    z-index: 100;
  }
</style>
```

**AFTER (0 hardcoded values):**
```svelte
<style>
  @import '/src/styles/shared.css';
  
  :global(body) {
    background: var(--app-background) !important;
    color: var(--text-color) !important;
    transition: var(--effects-transition-default);
    margin: var(--spacing-0);
    padding: var(--spacing-0);
    font-family: var(--typography-fontFamily-system);
  }
  
  .app {
    height: var(--app-container-height);
    overflow: hidden;
    /* Uses classes: flex-column position-relative */
  }
  
  .recycle-bin-icon {
    position: fixed;
    bottom: var(--spacing-standard);
    right: var(--spacing-standard);
    z-index: var(--zIndex-floating);
    /* Uses class: icon-button */
  }
</style>

<!-- In template -->
<a href="/recyclebin" class="recycle-bin-icon icon-button">
```

### Example: Update `MessageScrollback.svelte`
**BEFORE (87 values):** Multiple duplicate definitions
**AFTER (< 10 values):** Uses shared classes

```svelte
<div class="scrollback-base">
  <div class="messages">
    {#each messages as message}
      <div class="message">
        <span class="role-label-base role-label-boss">Boss</span>
        <div class="message-content-base">
          {message.content}
        </div>
        <div class="action-icons-group">
          <button class="icon-button">...</button>
        </div>
      </div>
    {/each}
  </div>
</div>
```

---

## PHASE 4: Remove Duplication

### Deduplication Strategy:

1. **Icon Buttons (50+ instances → 1 class)**
   - All use: 32px container, 16px SVG, same hover effects
   - Solution: Single `.icon-button` class

2. **Flex Center (36 instances → 1 class)**
   - `display: flex; align-items: center; justify-content: center`
   - Solution: `.flex-center` class

3. **Reset Styles (26 instances → 1 class)**
   - `margin: 0; padding: 0`
   - Solution: `.reset` class

4. **Scrollback Container (3 components → 1 class)**
   - MessageScrollback, RecycleBinScrollback, ScrollbackUI
   - Solution: `.scrollback-base` class

5. **Role Labels (2 components → 1 set of classes)**
   - MessageScrollback, RecycleBinScrollback
   - Solution: `.role-label-base`, `.role-label-boss`, `.role-label-samara`

---

## RESULTS

### Before:
- 437 hardcoded values
- 164 unique values
- Duplicated across 7+ components
- No central theme control

### After:
- ~50 theme variables in rainy-night.json
- ~15 shared CSS classes
- 0 duplication
- Full theme control

### Benefits:
1. **90% reduction** in CSS code
2. **Single source of truth** for all styling
3. **Easy theme switching** - just swap JSON
4. **Consistent spacing** - no more 19px vs 20px
5. **Maintainable** - change once, update everywhere

---

## Implementation Order:

1. **Update rainy-night.json** with new structure
2. **Create shared.css** with reusable classes
3. **Update ThemeApplier** to generate CSS variables
4. **Start with smallest components** (reduce risk):
   - ThemePickerUI (47 values)
   - MarkdownRenderer (45 values)
5. **Then update page components**:
   - +page.svelte (28 values)
   - recyclebin/+page.svelte (28 values)
6. **Finally tackle the big ones**:
   - RecycleBinScrollback (78 values)
   - MessageScrollback (87 values)
   - InputBarUI (124 values)

---

## Testing Checklist:
- [ ] All icons same size
- [ ] Hover states work
- [ ] Spacing consistent
- [ ] Theme switching works
- [ ] No visual regressions
- [ ] Responsive behavior intact