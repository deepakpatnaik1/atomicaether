# SystemPromptBrick Wire Documentation

## Purpose
LEGO Brick for loading system prompt templates and performing variable substitution. Provides clean interface for getting rendered prompts with your machine trim rules.

## Bus Connections

### ConfigBus
- **Subscribes to**: `SystemPromptBrick` configuration changes
- **Loads**: Template settings, default variables, hot reload preferences

### EventBus
- **Publishes**: 
  - `systemprompt:loaded` - Template successfully loaded
  - `systemprompt:render` - Prompt rendered (success/error)

### ErrorBus
- **Reports to**: Template loading errors, rendering failures
- **Severity levels**: Warning for missing templates, Error for system failures

## API

### Core Methods
```typescript
// Initialize the brick
await systemPromptBrick.initialize();

// Get rendered prompt
const prompt = await systemPromptBrick.getPrompt('machine-trim', {
  persona: 'samara',
  model: 'claude-sonnet-4',
  context: 'general conversation'
});

// List available templates
const templates = systemPromptBrick.getAvailableTemplates();
```

### Templates
- **machine-trim**: Your sophisticated machine trim rules in system prompt format
- Extensible for additional prompt types (personas, specialized tasks)

## Configuration
Create `/aetherVault/Config/SystemPromptBrick.json`:
```json
{
  "templatesPath": "/aetherVault/prompts",
  "defaultVariables": {
    "model": "claude-sonnet-4",
    "context": "general conversation"
  },
  "enableHotReload": true
}
```

## Integration Points

### With LLMBrick
```typescript
const prompt = await systemPromptBrick.getPrompt('machine-trim', variables);
// Pass prompt.content as system message to LLMBrick
```

### With DualResponseBrick (Future)
```typescript
// DualResponseBrick will use SystemPromptBrick internally
const dualResponse = await dualResponseBrick.process(userMessage, {
  promptTemplate: 'machine-trim',
  variables: { persona, model }
});
```

## Essential Boss Rules Compliance

### Rule 1: Atomic LEGO ✅
- Single responsibility: template loading and variable substitution
- Standard bus connectors (ConfigBus, EventBus, ErrorBus)
- Composable with other bricks

### Rule 2: Add, Don't Modify ✅
- Zero impact on existing LLMBrick or MessageScrollback
- New functionality through new brick

### Rule 3: Easy Removal ✅
**To remove SystemPromptBrick completely:**
1. Delete `/lib/bricks/SystemPromptBrick/` folder
2. Remove SystemPromptBrick imports from any consuming bricks
3. Remove `/aetherVault/Config/SystemPromptBrick.json`
4. Replace `systemPromptBrick.getPrompt()` calls with hardcoded strings

**Fallback**: Consumer bricks work with static prompts

### Rule 4: Configuration-Driven ✅
- All templates externalized (future: filesystem loading)
- Hot reload support for development
- Configurable default variables

### Rule 5: No Breaking Changes ✅
- EventBus communication only
- Weak references in subscriptions
- Graceful error handling

## Usage Examples

### Basic Machine Trim Prompt
```typescript
const prompt = await systemPromptBrick.getPrompt('machine-trim', {
  persona: 'samara',
  model: 'gpt-4o',
  context: 'user asking about astronomy'
});
// Returns fully rendered system prompt with your machine trim rules
```

### Template Development
Hot reload enabled - modify templates and see changes instantly without recompiling.

## Future Extensions
- Filesystem template loading from `/aetherVault/prompts/`
- Template versioning and A/B testing
- Prompt optimization metrics
- Multi-language template support

---

**SystemPromptBrick**: The foundation for intelligent, rule-based LLM instruction that preserves your weeks of machine trim linguistic development.