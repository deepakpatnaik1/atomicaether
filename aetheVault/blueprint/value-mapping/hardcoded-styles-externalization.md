# Hardcoded Styles Externalization Mapping
## Analysis Date: 2025-08-25

### Executive Summary
**Total Hardcoded Values Found: 437**
- InputBarUI.svelte: 124 values
- MessageScrollback.svelte: 87 values
- RecycleBinScrollback.svelte: 78 values
- ThemePickerUI.svelte: 47 values
- MarkdownRenderer.svelte: 45 values
- Main pages (+page.svelte, recyclebin): 56 values

---

## 1. CRITICAL VALUES - App Structure & Layout

### Main App Container
**Current Location:** `/routes/+page.svelte`, `/routes/recyclebin/+page.svelte`
```css
height: 100vh → theme.app.container.height
width: 32px → theme.icons.container.size
height: 32px → theme.icons.container.size
width: 16px → theme.icons.svg.size
height: 16px → theme.icons.svg.size
```

**Semantic Impact:** These values define the fundamental app structure. Changing them affects:
- Overall app viewport height
- Icon button sizes across the entire UI
- Visual consistency of interactive elements

**Externalization:**
```json
"app": {
  "container": {
    "height": "100vh"
  }
},
"icons": {
  "container": {
    "size": "32px"
  },
  "svg": {
    "size": "16px"
  }
}
```

---

## 2. SPACING SYSTEM

### Global Spacing Values
**Locations:** All components
```css
margin: 0 → theme.spacing.reset
padding: 0 → theme.spacing.reset
bottom: 20px → theme.spacing.standard
right: 20px → theme.spacing.standard
padding: 6px 8px → theme.spacing.compact.vertical theme.spacing.compact.horizontal
gap: 4px → theme.spacing.micro
```

**Semantic Impact:** Spacing creates visual hierarchy and breathing room. Changes affect:
- Component density
- Visual grouping
- Overall "airiness" of the interface

**Externalization:**
```json
"spacing": {
  "reset": "0",
  "micro": "4px",
  "tiny": "6px",
  "small": "8px",
  "compact": {
    "vertical": "6px",
    "horizontal": "8px"
  },
  "medium": "12px",
  "standard": "20px",
  "large": "32px"
}
```

---

## 3. COLOR SYSTEM

### Interactive States
**Location:** Multiple components
```css
color: rgba(255, 255, 255, 0.6) → theme.colors.interactive.default
color: rgba(255, 255, 255, 0.95) → theme.colors.interactive.hover
background: rgba(255, 255, 255, 0.1) → theme.colors.interactive.hoverBg
background: transparent → theme.colors.interactive.transparent
```

**Semantic Impact:** Colors define interactivity and state feedback. Changes affect:
- User perception of clickable elements
- Hover/active state visibility
- Overall theme mood

**Externalization:**
```json
"colors": {
  "interactive": {
    "default": "rgba(255, 255, 255, 0.6)",
    "hover": "rgba(255, 255, 255, 0.95)",
    "hoverBg": "rgba(255, 255, 255, 0.1)",
    "activeBg": "rgba(255, 255, 255, 0.08)",
    "transparent": "transparent"
  }
}
```

### Semantic Colors
**Location:** MessageScrollback, MarkdownRenderer
```css
color: #ef4444 → theme.colors.semantic.boss
color: #f97316 → theme.colors.semantic.samara
color: #DFD0B8 → theme.colors.text.primary
```

**Semantic Impact:** These identify speakers and content types. Changes affect:
- Speaker identification
- Content hierarchy
- Brand identity

---

## 4. TYPOGRAPHY SYSTEM

### Font Families
**Locations:** All text components
```css
font-family: system-ui, -apple-system, sans-serif → theme.typography.fontFamily.system
font-family: 'Lexend', -apple-system, ... → theme.typography.fontFamily.content
```

### Font Sizes
```css
font-size: 13px → theme.typography.size.base
font-size: 11px → theme.typography.size.small
font-size: 14px → theme.typography.size.medium
```

**Semantic Impact:** Typography affects readability and hierarchy. Changes impact:
- Content legibility
- Information density
- Visual hierarchy

**Externalization:**
```json
"typography": {
  "fontFamily": {
    "system": "system-ui, -apple-system, sans-serif",
    "content": "'Lexend', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif"
  },
  "size": {
    "tiny": "11px",
    "small": "12px",
    "base": "13px",
    "medium": "14px",
    "large": "16px"
  },
  "lineHeight": {
    "tight": "1.2",
    "normal": "1.5",
    "relaxed": "1.8"
  },
  "weight": {
    "normal": "400",
    "medium": "500",
    "semibold": "600",
    "bold": "700"
  }
}
```

---

## 5. EFFECTS & TRANSITIONS

### Transitions
**Location:** All interactive elements
```css
transition: all 0.3s ease → theme.effects.transition.default
transition: all 0.2s ease → theme.effects.transition.quick
```

### Transforms
```css
transform: scale(1.05) → theme.effects.transform.scaleHover
transform: scale(0.95) → theme.effects.transform.scaleActive
transform: uppercase → theme.effects.transform.textUppercase
```

### Filters
```css
backdrop-filter: blur(10px) → theme.effects.filter.backdropBlur
opacity: 0.6 → theme.effects.opacity.muted
opacity: 0.95 → theme.effects.opacity.nearFull
```

**Semantic Impact:** Effects provide polish and feedback. Changes affect:
- Perceived responsiveness
- Visual polish
- Interaction feedback quality

**Externalization:**
```json
"effects": {
  "transition": {
    "default": "all 0.3s ease",
    "quick": "all 0.2s ease",
    "slow": "all 0.5s ease"
  },
  "transform": {
    "scaleHover": "scale(1.05)",
    "scaleActive": "scale(0.95)",
    "textUppercase": "uppercase"
  },
  "filter": {
    "backdropBlur": "blur(10px)"
  },
  "opacity": {
    "disabled": "0.3",
    "muted": "0.6",
    "subtle": "0.7",
    "nearFull": "0.95",
    "full": "1"
  }
}
```

---

## 6. BORDERS & SHAPES

### Border Radius
```css
border-radius: 50% → theme.borders.radius.round
border-radius: 20px → theme.borders.radius.large
border-radius: 6px → theme.borders.radius.medium
border-radius: 4px → theme.borders.radius.small
```

### Border Styles
```css
border: none → theme.borders.style.none
border: 1px solid → theme.borders.style.thin
border: 1px solid rgba(255, 255, 255, 0.05) → theme.borders.style.subtle
```

**Semantic Impact:** Borders define visual boundaries. Changes affect:
- Component separation
- Visual grouping
- Overall aesthetic (rounded vs sharp)

---

## 7. LAYOUT SPECIFIC

### MessageScrollback Layout
```css
height: calc(100vh - 114px) → theme.scrollback.container.height
width: 650px → theme.scrollback.container.width.mobile
width: 800px → theme.scrollback.container.width.desktop
max-width: calc(100vw - 40px) → theme.scrollback.container.maxWidth
```

### InputBar Layout
```css
min-width: 705px → theme.inputBar.breakpoint.desktop
z-index: 1000 → theme.zIndex.dropdown
```

**Semantic Impact:** Layout values define component positioning. Changes affect:
- Responsive behavior
- Content width and readability
- Layer stacking order

---

## 8. COMPONENT-SPECIFIC VALUES

### Action Icons Container
```css
padding: 6px 8px → theme.actionIcons.container.padding
gap: 4px → theme.actionIcons.container.gap
```

### Role Labels
```css
padding: 2px 8px → theme.roleLabel.padding
font-size: 11px → theme.roleLabel.fontSize
letter-spacing: 0.5px → theme.roleLabel.letterSpacing
```

---

## Implementation Strategy

### Phase 1: Core Systems
1. Create base spacing scale
2. Define color system with semantic names
3. Establish typography scale
4. Set up effects/transitions

### Phase 2: Component Tokens
1. Map component-specific values to theme tokens
2. Create component namespaces in theme
3. Replace hardcoded values with theme references

### Phase 3: Validation
1. Test all interactive states
2. Verify responsive breakpoints
3. Ensure visual consistency

### Example Theme Variable Usage
```svelte
<!-- Before -->
<style>
  .action-icon {
    width: 32px;
    height: 32px;
    color: rgba(255, 255, 255, 0.6);
  }
</style>

<!-- After -->
<style>
  .action-icon {
    width: var(--icons-container-size);
    height: var(--icons-container-size);
    color: var(--colors-interactive-default);
  }
</style>
```

---

## Risk Assessment

### High Risk Changes
- `height: calc(100vh - 114px)` - Affects scrollback visibility
- `z-index` values - Could break layering
- `width: 650px/800px` - Affects content readability

### Low Risk Changes  
- Color opacity values
- Transition durations
- Border radius values
- Padding/margin adjustments

### Testing Requirements
1. Test on multiple screen sizes
2. Verify all interactive states
3. Check theme switching functionality
4. Validate accessibility (contrast ratios)

---

## Next Steps
1. Update `rainy-night.json` with all externalized values
2. Create CSS variable mapping in ThemeApplier
3. Replace hardcoded values in components
4. Test thoroughly
5. Document theme structure for future themes