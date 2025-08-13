# Rule 5: Easy Removal - Delete Without Fear

**The Principle**: If removing a feature is complicated, you built it wrong. Every brick must be deletable in under 5 steps with zero cascading failures.

### The Removal Litmus Test

```typescript
// ✅ EASY REMOVAL: Delete folder, remove one wire point
// To remove PersonaBrick:
// 1. Delete the PersonaBrick/ folder
// 2. Remove personaBrick initialization from main.ts
// 3. Delete config/personas.json
// That's it. App continues working, just without persona switching.

// ❌ HARD REMOVAL: Tentacles everywhere
// To remove BadPersonaService:
// 1. Delete PersonaService.ts
// 2. Fix 37 TypeScript errors in 12 files
// 3. Update MessageStore to handle missing persona
// 4. Modify ConversationFlow persona logic
// 5. Change 8 UI components that import PersonaService
// 6. Update tests in 5 different test files
// 7. ... 20 more steps
```

### The Wire Contract

Every brick MUST have a wire file documenting removal:

```markdown
# PersonaBrick/wire/PersonaWire.md

## Removal Instructions
To remove PersonaBrick completely:
1. Delete the PersonaBrick/ folder
2. Remove personaBrick initialization from main.ts
3. Delete config/personas.json

**Result**: App works perfectly without persona switching. Messages will use default "User" speaker.

## Integration Points
- main.ts - Brick initialization
- config/personas.json - Configuration file
- Publishes: PersonaChangedEvent, PersonaLoadedEvent
- Subscribes to: TextInputEvent, ModelChangedEvent
```

### Why Easy Removal Matters

**1. Architectural Validation**
```typescript
// If removal is hard, you have hidden coupling
// Easy removal proves true LEGO architecture
```

**2. Feature Velocity**
```typescript
// Not afraid to experiment when removal is easy
// "Let's try adding voice input" - can remove if it doesn't work out
```

**3. Technical Debt Prevention**
```typescript
// Hard-to-remove code accumulates as debt
// Easy removal keeps codebase clean
```

**4. Developer Confidence**
```typescript
// New developer: "Can I safely remove this old feature?"
// Wire file: "Yes, here's exactly how in 3 steps"
```

### Removal Patterns

**Pattern 1: Event Publisher Removal**
```typescript
// PersonaBrick publishes PersonaChangedEvent
// Remove PersonaBrick = no more PersonaChangedEvent
// Other bricks handle absence gracefully:
const unsubscribe = eventBus.subscribe(PersonaChangedEvent, (e) => {
    this.currentPersona = e.persona;
});
// If no events come, currentPersona stays at default
```

**Pattern 2: State Provider Removal**
```typescript
// ModelPickerBrick sets 'currentModel' in StateBus
// Remove ModelPickerBrick = no state updates
// Other bricks use defaults:
const model = stateBus.get('currentModel') ?? 'claude-3.5-sonnet';
```

**Pattern 3: UI Component Removal**
```svelte
<!-- ConversationView.svelte -->
{#if personaEnabled}
    <PersonaIndicator />
{/if}
<!-- Remove PersonaBrick = personaEnabled false = UI adapts -->
```

### Quality Over Quantity

The number of steps doesn't matter. What matters is the quality of removal:

**✅ Good Removal Characteristics**
- **No cascading errors** - TypeScript compiles cleanly after removal
- **No runtime crashes** - App runs without exceptions
- **Linear process** - Each step is clear and independent
- **No detective work** - No hunting through code for references
- **Predictable outcome** - You know exactly what functionality is lost

**❌ Bad Removal Characteristics**
- **Fix 37 TypeScript errors** across multiple files
- **Hunt for hidden dependencies** in unexpected places
- **Update complex logic** to handle missing component
- **Trace through call stacks** to find all usages
- **Guess at side effects** of removal

### Removal Anti-Patterns to Avoid

**❌ Interface Segregation**
```typescript
// Don't create interfaces that other bricks depend on
interface PersonaProvider {
    getCurrentPersona(): Persona;
}
// Now removing PersonaBrick breaks everything that uses PersonaProvider
```

**❌ Shared Models**
```typescript
// Don't export models that other bricks import
export class Persona { } // in PersonaBrick

// In MessageBrick:
import { Persona } from '../PersonaBrick/models'; // Coupling!
```

**❌ Configuration Dependencies**
```json
// Don't reference other configs
{
    "messageStore": {
        "personaConfig": "../personas.json" // Now can't remove personas!
    }
}
```

### Testing Removal

Always actually test removal:

```bash
# 1. Note current functionality
npm run dev  # App works with personas

# 2. Follow removal instructions exactly
rm -rf src/bricks/PersonaBrick
# ... other steps from wire file

# 3. Verify app still works
npm run dev  # App works without personas

# 4. Check for errors
npm run check  # No TypeScript errors
npm test       # All tests pass
```

### The Graceful Degradation Principle

When a brick is removed, the app doesn't break - it gracefully degrades:

- Remove **PersonaBrick** → Messages show as "User" instead of persona names
- Remove **VoiceBrick** → Text input still works
- Remove **ThemeBrick** → Default browser styles apply
- Remove **CloudSyncBrick** → Local storage still works

### Documentation Requirements

Every wire file MUST include:

1. **Exact removal steps** with file locations
2. **What functionality is lost** when removed
3. **How the app degrades** gracefully
4. **What to verify** after removal (compile, runtime, tests)

### The Promise

Follow Easy Removal and you get:
- **Fearless refactoring** - Remove anything safely
- **Clean codebase** - No accumulation of unused features
- **Fast experimentation** - Try ideas without commitment
- **Clear boundaries** - Removal difficulty reveals coupling

The ultimate test: Can a new developer remove your brick by only reading the wire file? If yes, you've achieved true LEGO architecture.