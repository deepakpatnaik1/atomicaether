# Essential Boss Rule #10: Demo-Driven Development

**The Principle**: Every brick must prove its worth through a working demo. The demo gallery is the contract between implementation and expectation.

## What This Means in Practice

```typescript
// ✅ DEMO-DRIVEN: ThemeRegistry demo proves all functionality
export function ThemeRegistryDemo() {
  // Test 1: Discovery
  const themes = themeRegistry.getThemes();
  
  // Test 2: Loading  
  const theme = themeRegistry.getTheme('rainy-night');
  
  // Test 3: Validation
  const exists = themeRegistry.hasTheme('midnight');
  
  // Test 4: Error handling
  const invalid = themeRegistry.getTheme('nonexistent');
  
  // Visual proof that everything works
  return <InteractiveThemeGallery />;
}

// ❌ NOT DEMO-DRIVEN: "Trust me, it works"
// No demo = no confidence in implementation
```

## The Demo Contract

**Every demo must:**
- **Exercise all public APIs** - Every method, every edge case
- **Show visual results** - Not just console logs, actual UI changes  
- **Handle errors gracefully** - Demonstrate failure modes
- **Be interactive** - Boss can click, type, test in real-time
- **Match production usage** - Same APIs, same patterns
- **Simulate real app context** - Show the brick as it would work in the main app

## Demo Hardcoding Exception

**Demo files are exempt from hardcoding rules** when simulating app context:

```typescript
// ✅ ALLOWED: Demo hardcodes app context to showcase the brick
export function TextHandlerDemo() {
  return (
    <div className="input-container">  {/* Hardcoded app layout */}
      <div className="input-bar">      {/* Hardcoded app styling */}
        <TextHandler                   {/* The actual brick being tested */}
          placeholder="Type here..."
          onTextChange={handleChange}
        />
      </div>
    </div>
  );
}

// ❌ NOT ALLOWED: Hardcoding within the brick itself
function TextHandler() {
  const height = 240; // ← Should come from config
  const color = "#ff0000"; // ← Should come from theme
}
```

**Rationale**: The demo must recreate the exact environment where the brick will operate. This requires hardcoding the surrounding app infrastructure (layouts, navigation, styling) that the brick doesn't control, so users can see how the brick behaves in realistic conditions.

**Scope**: This exception applies only to demo files (`*/demo/*.svelte`) and demo-specific styling. The core brick components must remain config-driven.

## Demo Gallery as Quality Gate

```
/demo/
├── brick-601-theme-registry/    # Tests theme discovery & loading
├── brick-602-theme-selector/    # Tests theme switching & persistence  
├── brick-603-theme-applier/     # Tests CSS property application
├── brick-604-theme-picker-ui/   # Tests complete user interaction
└── integration/                 # Tests bricks working together
```

## Quality Metrics

**If the demo:**
- ✅ Works smoothly → Implementation is production-ready
- ⚠️ Has rough edges → Implementation needs polish
- ❌ Doesn't work → Implementation is incomplete

## Real-World Benefits

1. **Confidence**: Boss can see and test every feature
2. **Documentation**: Demos show exactly how to use each brick
3. **Integration Testing**: Proves bricks work together
4. **Regression Prevention**: Demos catch when changes break functionality
5. **Onboarding**: New developers learn from working examples

## Implementation Pattern

```typescript
// Each brick exports its demo component
export { ThemeRegistryDemo } from './demo/ThemeRegistryDemo.svelte';

// Demo gallery routes to all demos
// /demo/theme-registry → ThemeRegistryDemo
// /demo/theme-selector → ThemeSelectorDemo
```

## The Promise

Follow Rule #10, and you will:
- **Ship with confidence** - Every feature is proven to work
- **Debug faster** - Isolated demos pinpoint issues immediately  
- **Onboard instantly** - New team members learn from working examples
- **Prevent regressions** - Demo breakage alerts you to problems
- **Build trust** - Boss sees every feature working before integration

**Demo-driven development transforms "it should work" into "I can see it working."**

---

This rule elevates your development process to the highest professional standards. Every brick earns its place through demonstrated value.