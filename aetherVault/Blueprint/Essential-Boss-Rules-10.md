# Rule 10: Demo First - Build the Playground Before the Castle

**The Principle**: Every feature gets a demo page immediately after implementation. Not for showing off - for proving it works, catching bugs early, and creating living documentation.

### The Demo-First Religion

```typescript
// ❌ FAITH-BASED DEVELOPMENT: "Trust me, it works"
class NewFeature {
    // 500 lines of "perfect" code
    // Integrated into 10 components
    // "Why is production broken?"
}

// ✅ DEMO-DRIVEN DEVELOPMENT: "Let me show you it works"
class NewFeature {
    // Build feature
    // Create /demo/new-feature
    // Fix issues in isolation
    // THEN integrate with confidence
}
```

### Why Demos Are Mandatory

**1. Compilation ≠ Correctness**
```typescript
// This compiles fine
const bus = new DiscoveryBus();  // But does it actually work?

// Demo proves it
<button on:click={() => bus.load('theme')}>
    Actually Load a Theme
</button>
```

**2. Integration Issues Surface Early**
```typescript
// Our real example: import paths
import { discoveryBus } from '$lib/buses';  // Seemed right
// Demo revealed: DiscoveryBus is not a constructor!
```

**3. Living Documentation**
```typescript
// Better than any README
// "How does DiscoveryBus work?"
// "Check /demo/discovery-bus"
// See it, click it, understand it
```

### The Demo Template

Every demo follows this structure:

```svelte
<!-- /src/routes/demo/[feature-name]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  
  // Feature states
  let loading = false;
  let error = '';
  let result = null;
  
  // Actions for every public method
  async function testMethod1() { }
  async function testMethod2() { }
  
  // Clear state display
  $: stateDisplay = { loading, error, result };
</script>

<div class="demo-container">
  <h1>FeatureName Demo</h1>
  
  <!-- Section 1: Actions -->
  <section>
    <h2>Actions</h2>
    <button on:click={testMethod1}>Test Method 1</button>
    <button on:click={testMethod2}>Test Method 2</button>
  </section>
  
  <!-- Section 2: State -->
  <section>
    <h2>Current State</h2>
    <pre>{JSON.stringify(stateDisplay, null, 2)}</pre>
  </section>
  
  <!-- Section 3: Output -->
  <section>
    <h2>Output</h2>
    {#if loading}<p>Loading...</p>{/if}
    {#if error}<p class="error">{error}</p>{/if}
    {#if result}<pre>{JSON.stringify(result, null, 2)}</pre>{/if}
  </section>
  
  <!-- Section 4: Debug -->
  <section>
    <h2>Debug Info</h2>
    <p>Check console for detailed logs</p>
    <p>Feature available at window.__featureName</p>
  </section>
</div>
```

### Demo Requirements by Feature Type

**Buses & Services**
- Test all public methods
- Show caching behavior
- Display event flow
- Clear cache/reset buttons

**UI Components**
- All visual states (default, hover, active, disabled)
- All size variations
- All color themes
- Error states
- Loading states
- Empty states

**LLM Features**
- Mock responses for fast testing
- Real API toggle
- Streaming visualization
- Error handling
- Rate limit handling

**Data Features**
- CRUD operations
- Search/filter
- Pagination
- Sorting
- Export/import

### The Demo Gallery System

**One command to rule them all:**
```bash
npm run demo
```

Opens a beautiful gallery with every brick displayed as a card:
- Auto-discovers all demos
- Groups by series (100s, 200s, etc.)
- Search and filter capabilities
- Click any card → taken to interactive demo
- Professional presentation for investors

### Real Examples from Our Session

**What the Demo Caught:**
1. Import path wrong: `'$lib/buses'` needed to be `'$lib/buses/discoveryBus'`
2. SSR issues: Needed dynamic import
3. Glob path issues: `/aetherVault` vs `../../aetherVault`
4. Missing exports in index.ts

**Without the Demo:**
- These bugs hide until production
- Debug across multiple files
- "Works on my machine"
- Mysterious integration failures

### The Boss-Approved Workflow

**THE STRICT SEQUENCE - NO SHORTCUTS:**

```bash
# 1. Implement the brick (feature)
npm run dev
# Build the brick in isolation

# 2. Create demo IMMEDIATELY
# Create interactive demo with all public methods
# Must be real, working demo - not mockup

# 3. Boss tests in demo gallery
npm run demo
# Boss clicks on the new demo
# Boss plays with ALL features
# Boss reports: "All OK" or issues

# 4. Fix any issues in isolation
# Still in demo, NOT integrated

# 5. ONLY AFTER Boss approves demo
# THEN AND ONLY THEN integrate into main app

# 6. Boss tests in main app
npm start
# Boss tests integrated feature
# Boss confirms it works with other bricks

# 7. Commit with demo
git add [brick files]
git add [demo files]
git commit -m "feat: [BrickName] with demo (Boss approved)"
```

**THE IRON RULE**: 
- **NO integration until Boss approves the demo**
- **Demo approval ≠ Integration approval**
- **Both must pass Boss review separately**

This prevents:
- Broken integrations
- Cascading failures
- "But it worked in my demo!"
- Production surprises

### Demo-Driven Development Benefits

1. **Faster debugging** - Isolated environment
2. **Better PRs** - Reviewers can test immediately
3. **Onboarding** - New devs explore via demos
4. **Regression testing** - Demos break when features break
5. **Customer support** - "Can you reproduce in the demo?"
6. **Investor ready** - Professional feature gallery

### The Litmus Test

Before marking ANY feature complete:
- Can I demo every public method?
- Can I see every possible state?
- Can I break it and see errors?
- Can I reset/clear/restart?
- Would a new developer understand it from the demo?
- Would an investor be impressed?

### When Demos Are Optional

Almost never, but:
- Pure utility functions (unit tests suffice)
- One-line bug fixes
- Config/constant changes
- Documentation updates
- Build tool configs

Even then, consider: "Would a demo have caught something?"

### The Rule

**Every feature ships with a demo, or it doesn't ship.**

Your code isn't done when it compiles.
It's not done when tests pass.
It's done when someone can click buttons in a demo and see it work.

### Remember

That moment when you clicked "rainy-night" and saw the theme load? That's not just debugging - that's confidence. You SAW it work. You KNOW it works. 

Build the playground before the castle. Always.