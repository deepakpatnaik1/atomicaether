# Rule 7: Ask Boss for Logic - Don't Invent Requirements

**The Principle**: UI flows and business logic come from Boss, not from your imagination. When in doubt, ask. When not in doubt, still ask.

### The Golden Rule

```typescript
// ❌ INVENTING: Making assumptions about what users want
class PersonaBrick {
    async switchPersona(newPersona: string) {
        // I'll add a confirmation dialog, users probably want that
        if (!confirm(`Switch to ${newPersona}?`)) return;
        
        // I'll add a cool animation, that would be nice
        await this.animateTransition();
        
        // I'll save the last 5 personas, might be useful
        this.saveToHistory(newPersona);
        
        // I'll prevent switching too fast, seems reasonable
        if (this.lastSwitch < Date.now() - 1000) return;
    }
}

// ✅ ASKING: Getting actual requirements
class PersonaBrick {
    async switchPersona(newPersona: string) {
        // Boss said: "Instant switching, no confirmations"
        this.eventBus.publish(new PersonaChangedEvent(newPersona));
    }
}
```

### What Requires Boss Input

**UI/UX Decisions**
- How should errors be displayed? (Toast, inline, modal?)
- What happens on success? (Notification, redirect, silent?)
- What's the loading state? (Spinner, skeleton, progress bar?)
- How should empty states look?
- What are the keyboard shortcuts?
- Mobile behavior differences?

**Business Logic**
- What validates as acceptable input?
- When should data auto-save vs manual save?
- What are the permission rules?
- How should conflicts be resolved?
- What's the retry strategy for failures?
- Rate limiting requirements?

**Feature Behavior**
- Should this be real-time or on-demand?
- Is this feature toggleable?
- What's the default state?
- How does it interact with other features?
- What analytics events to track?

### The Ask Boss Patterns

**Pattern 1: The Clarification**
```typescript
// You're implementing message sending
"Boss, when a user sends a message:
1. Should it show as 'sending' first?
2. Should failed messages be retryable?
3. Should we show typing indicators?
4. Any character limit?
5. Support markdown? Images?"
```

**Pattern 2: The Options Presentation**
```typescript
// You found multiple approaches
"Boss, for auth I found 3 patterns:
1. Magic links (no passwords)
2. OAuth only (GitHub, Google)
3. Traditional email/password

Which fits our vision?"
```

**Pattern 3: The Assumption Check**
```typescript
// You think you know, but verify
"Boss, I'm assuming:
- Personas switch instantly (no confirmation)
- Messages persist locally
- No user accounts initially

Correct?"
```

### Real Examples

**Example 1: Error Handling**
```typescript
// ❌ INVENTING: Deciding error UX yourself
catch (error) {
    // I'll make it a red modal with retry button
    showModal({
        title: "Oops! Something went wrong",
        message: "Please try again later",
        buttons: ["Retry", "Cancel"]
    });
}

// ✅ ASKING: "Boss, how should API errors appear?"
// Boss: "Simple toast, bottom-right, auto-dismiss after 3s"
catch (error) {
    errorBus.report({
        message: error.message,
        duration: 3000,
        position: 'bottom-right'
    });
}
```

**Example 2: Feature Flow**
```typescript
// ❌ INVENTING: Creating your own user flow
class VoiceBrick {
    // I'll add voice activation
    // I'll transcribe in real-time
    // I'll show waveforms
    // I'll add noise cancellation
}

// ✅ ASKING: "Boss, what's the voice input flow?"
// Boss: "Push-to-talk only, show recording indicator, no waveforms"
class VoiceBrick {
    startRecording() { /* exactly what Boss specified */ }
}
```

### When to Ask

**Always Ask About:**
- Default values and states
- Error messages and handling
- Success feedback
- Loading and empty states
- Transition animations
- Confirmation requirements
- Permission and access rules
- Data validation rules
- Feature interactions

**Ask Even When:**
- You think it's "obvious"
- You've seen it done elsewhere
- It seems like a small detail
- You're "improving" the UX
- You found a "better" pattern

### How to Ask Effectively

**1. Present the Context**
```
"I'm implementing the persona switcher.
Users will click personas from a dropdown."
```

**2. List Specific Questions**
```
"Questions:
1. Show current persona in the dropdown?
2. Allow keyboard navigation?
3. Close on click or stay open?
4. Show persona descriptions?"
```

**3. Suggest Options When Unsure**
```
"For message deletion, I see 3 options:
A) Soft delete (hide but keep in DB)
B) Hard delete immediately  
C) Move to trash for 30 days

Which approach?"
```

### The Anti-Patterns

**❌ The Feature Creep**
```typescript
// Boss: "Add message sending"
// You add: Typing indicators, read receipts, reactions, 
// threading, editing, formatting toolbar...
```

**❌ The UX Designer Mode**
```typescript
// Boss: "Show errors"
// You create: Animated error boundaries with shake effects,
// color-coded severity levels, auto-retry mechanisms...
```

**❌ The Assumption Cascade**
```typescript
// One assumption leads to another:
// "Users probably want history" →
// "So they'll need search" →
// "So they'll need filters" →
// "So they'll need saved searches"...
```

### The Boss Context

Remember:
- Boss has the product vision
- Boss knows the users
- Boss owns the requirements
- Boss decides the tradeoffs

Your job:
- Implement Boss's vision precisely
- Ask when anything is unclear
- Suggest technical approaches
- Flag technical constraints

### The Implementation Checklist

Before coding any feature:
- [ ] Do I have explicit requirements from Boss?
- [ ] Are all UI states defined?
- [ ] Is the happy path clear?
- [ ] Are error cases specified?
- [ ] Do I know the default values?
- [ ] Are edge cases covered?

If any checkbox is empty: Ask Boss.

### Remember

The best engineers don't guess requirements - they clarify them. Every assumption you make is a potential bug, not in your code, but in the product itself. Boss owns the "what" and "why". You own the "how".