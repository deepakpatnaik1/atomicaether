# Rule 2: The Four Buses - Total Decoupling Through Standard Interfaces

**The Principle**: Components never know about each other. They only know about four buses. This creates true LEGO architecture where any brick can connect without direct dependencies.

### The Four Buses Enable Decoupling

```typescript
// WITHOUT BUSES: Components are tightly coupled
class MessageStore {
    constructor(private personaSystem: PersonaSystem) {} // Direct dependency!
    
    addMessage(msg: Message) {
        const persona = this.personaSystem.getCurrentPersona(); // Coupling!
    }
}

// WITH BUSES: Components are completely decoupled
class MessageStore {
    constructor(private eventBus: EventBus) {} // Only knows EventBus
    
    addMessage(msg: Message) {
        this.eventBus.publish(new MessageAddedEvent(msg)); // Fire and forget
        // MessageStore has NO IDEA who's listening!
    }
}
```

### How Each Bus Decouples

**1. EventBus - Communication Without Knowledge**
```typescript
// PersonaPicker publishes, doesn't know who cares
this.eventBus.publish(new PersonaChangedEvent(newPersona));

// MessageStore subscribes, doesn't know who sent it
this.eventBus.subscribe(PersonaChangedEvent, (e) => this.updateSpeaker(e.persona));
```

**2. ConfigBus - Settings Without Dependencies**
```typescript
// Each brick loads its own config, no passing props through layers
const config = await this.configBus.load<PersonaConfig>('personas');
```

**3. StateBus - Shared State Without Coupling**
```typescript
// ModelPicker sets state
this.stateBus.set('currentModel', 'claude-3.5');

// ConversationFlow reads it - they never import each other!
const model = this.stateBus.get('currentModel');
```

**4. ErrorBus - Error Handling Without Try/Catch Chains**
```typescript
// Any brick reports errors
this.errorBus.report(new ConfigLoadError('personas.json missing'));

// ErrorToast displays them - total separation
this.errorBus.subscribe(ErrorEvent, (e) => this.showToast(e.error));
```

### Real Decoupling Benefits

1. **Add features without modifying existing code**
   - New SuperJournal brick? Just subscribes to MessageAddedEvent
   - Existing MessageStore has no idea it exists

2. **Replace implementations freely**
   - Swap SQLite MessageStore for PostgreSQL version
   - As long as it publishes same events, nothing breaks

3. **Test in complete isolation**
   ```typescript
   // Test PersonaBrick without any other components
   const mockEventBus = new MockEventBus();
   const persona = new PersonaBrick(mockEventBus);
   // No complex mocking needed!
   ```

4. **Understand components individually**
   - To understand MessageStore, only need to know:
     - What events it publishes
     - What events it subscribes to
   - Don't need to trace through 10 other files

### The Architecture

Components broadcast into the void and listen to the universe, never knowing about each other's existence. The buses are the standard connectors that make this possible - just like real LEGO bricks have standard studs that fit any other brick.