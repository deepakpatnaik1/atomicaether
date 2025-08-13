# Rule 4: LEGO Bricks - Composable Components with Standard Connectors

**The Principle**: Complex features are simple compositions of independent bricks. Each brick has exactly ONE responsibility and connects to others only through the standard bus interfaces.

### The LEGO Formula

```
New Feature = New Model + New Service + New UI Component + Wire through Buses
```

### What Makes a Component a "LEGO Brick"

```typescript
// ✅ LEGO BRICK: Self-contained with standard connectors
export class PersonaBrick {
    constructor(
        private eventBus: EventBus,
        private configBus: ConfigBus,
        private stateBus: StateBus
    ) {
        // Standard connectors only - no custom dependencies
    }
    
    async init() {
        // Load own config
        this.config = await this.configBus.load<PersonaConfig>('personas');
        
        // Subscribe to events it cares about
        this.eventBus.subscribe(MessageSentEvent, e => this.trackUsage(e));
        
        // Publish events others might care about
        this.eventBus.publish(new PersonaLoadedEvent(this.config.personas));
    }
}

// ❌ NOT A LEGO BRICK: Custom connections everywhere
export class BadPersonaService {
    constructor(
        private messageStore: MessageStore,      // Custom dependency!
        private modelPicker: ModelPicker,        // Another one!
        private userPreferences: UserPreferences // And another!
    ) {
        // This isn't a brick - it's welded to specific components
    }
}
```

### Perfect Brick Structure

```
PersonaBrick/
├── core/
│   └── PersonaBrick.ts         # Main brick class
├── events/
│   └── PersonaEvents.ts        # Events this brick publishes
├── models/
│   └── PersonaModels.ts        # Data structures
├── services/
│   └── PersonaService.ts       # Business logic
├── ui/
│   └── PersonaUI.svelte        # Visual components
└── wire/
    └── PersonaWire.md          # Integration documentation
```

### The LEGO Principles

**1. Single Responsibility**
```typescript
// PersonaDetector ONLY detects personas from text
// PersonaUI ONLY displays persona selection
// PersonaStore ONLY manages persona state
// Each brick does ONE thing perfectly
```

**2. Standard Connectors Only**
```typescript
// Every brick can ONLY depend on:
type StandardConnectors = {
    eventBus: EventBus;
    configBus: ConfigBus;
    stateBus: StateBus;
    errorBus: ErrorBus;
}
// Nothing else. Ever.
```

**3. Complete Independence**
```typescript
// Test any brick in isolation
const personaBrick = new PersonaBrick(
    new MockEventBus(),
    new MockConfigBus(),
    new MockStateBus()
);
// No complex dependency graphs to mock
```

**4. Composability**
```typescript
// Voice Input + Personas = Voice-activated personas
// Just add both bricks. They compose automatically via events:
// VoiceBrick publishes VoiceInputEvent
// PersonaBrick subscribes to VoiceInputEvent
// Zero code changes to either brick
```

### Real Examples

**Adding Voice Input**
```typescript
// 1. Create VoiceBrick
export class VoiceBrick {
    async processVoice(audio: ArrayBuffer) {
        const text = await this.speechToText(audio);
        this.eventBus.publish(new VoiceInputEvent(text));
    }
}

// 2. Any brick that handles text automatically supports voice
// PersonaBrick already subscribes to TextInputEvent
// VoiceInputEvent extends TextInputEvent
// Automatic integration - no modifications needed!
```

**Swapping Implementations**
```typescript
// Replace local storage with cloud sync
// Old: LocalMessageBrick publishes MessageSavedEvent
// New: CloudMessageBrick publishes same MessageSavedEvent
// All other bricks continue working unchanged
```

### The Brick Contract

Every brick MUST:
1. **Declare its events** - What it publishes and subscribes to
2. **Load its own config** - Never passed in from outside
3. **Handle its own errors** - Report to ErrorBus
4. **Document removal** - Clear steps in wire file
5. **Work in isolation** - Full functionality with just buses

### Why This Works

- **New developer understanding**: "Oh, it's just LEGO bricks!"
- **Feature velocity**: Combine existing bricks in new ways
- **Debugging simplicity**: Each brick is independent
- **Testing clarity**: Test each brick alone
- **Refactoring safety**: Change internals without breaking connections

### The Litmus Test

Ask yourself:
1. Could I remove this brick and the app would still work?
2. Could I test this brick with mock buses only?
3. Does this brick know about any other brick?
4. Are all connections through standard buses?

If any answer is "no", it's not a LEGO brick.

### The Magic

When you follow the LEGO principle:
- Features snap together instantly
- Bugs are isolated to single bricks
- New developers are productive in hours
- The codebase grows without becoming complex

It's not about being modular - it's about having standard connectors that make modularity automatic.