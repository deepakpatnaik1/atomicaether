# DualResponseBrick Wire Documentation

## Purpose
LEGO Brick for generating both normal and machine-trimmed responses from a single LLM call. Enables efficient dual storage workflow while preserving weeks of machine trim rule development.

## Bus Connections

### ConfigBus
- **Loads**: `DualResponseBrick` configuration for dual-response prompts and parsing settings
- **Fallback**: Robust defaults ensure functionality even without config file

### EventBus
- **Publishes**: 
  - `dual-response:initialized` - Initialization success/failure with config info
  - `dual-response:generating` - Generation start event with request metadata
  - `dual-response:generated` - Dual response completion (success with compression metrics)
  - `dual-response:parsed` - Response parsing completion with parsing success status
  - `dual-response:error` - Generation or parsing errors with detailed error info
  - `dual-response:fallback` - When fallback behavior is used (normal response only)
  - `dual-response:config-updated` - Runtime configuration updates

### StateBus
- **Sets**: 
  - `dual-response:initialized` - Boolean initialization status
  - `dual-response:config` - Current configuration object
  - `dual-response:generating` - Boolean generation in-progress status
  - `dual-response:current-request` - Current request being processed
  - `dual-response:last-result` - Last generation result with metadata
  - `dual-response:last-error` - Last error message if generation failed

### ErrorBus
- **Reports**: LLM call failures, parsing errors, configuration issues
- **Severity**: Warning for operational errors, Fatal for initialization failures

## API

### Core Methods
```typescript
// Initialize with configuration
const dualResponseBrick = new DualResponseBrick(eventBus, configBus, stateBus, errorBus);

// Generate dual response from user message
const result = await dualResponseBrick.generate({
  user_message: "What causes comets to have tails?",
  system_prompt: "You are Samara...",
  persona: 'samara',
  model: 'claude-3-5-sonnet-20241022',
  timestamp: Date.now()
}, llmService);

// Check availability
const isReady = dualResponseBrick.ready;

// Get metrics and status
const metrics = dualResponseBrick.getMetrics();
```

### Dual Response Format
```typescript
interface DualResponse {
  normal_response: string;     // Full conversational response
  machine_trim: MachineTrimResponse; // Compressed semantic-only response
  generation_metadata: {
    model: string;
    persona: string;
    timestamp: number;
    compression_ratio: number;    // 0.4 = 60% compression
    parsing_success: boolean;     // true if machine trim was extracted
    generation_time_ms: number;
    original_length: number;
    compressed_length: number;
  };
}
```

## Configuration
File: `/aetherVault/config/DualResponseBrick.json`
```json
{
  "dualResponsePrompt": "After providing your complete response, add a new line and write \"MACHINE_TRIM:\" followed by a compressed version...",
  "machineTrimsDelimiter": "MACHINE_TRIM:",
  "fallbackBehavior": "normal_only",
  "timeoutMs": 30000,
  "maxRetries": 2,
  "compressionTarget": 0.6,
  "enableInferabilityDetection": true,
  "debugMode": false
}
```

## Integration Points

### With SystemPromptBrick
```typescript
// SystemPromptBrick provides enhanced prompts with machine trim rules
const systemPrompt = await systemPromptBrick.getPrompt('samara');
const dualResponse = await dualResponseBrick.generate({
  user_message: userMessage,
  system_prompt: systemPrompt,
  persona: 'samara',
  model: selectedModel
}, llmService);
```

### With JournalBrick (Current)
```typescript
// Store machine trim using JournalBrick
const dualResponse = await dualResponseBrick.generate(request, llmService);
if (dualResponse.success && dualResponse.response) {
  await journalBrick.store(dualResponse.response.machine_trim, {
    turnId: 'turn-123',
    persona: 'samara',
    model: selectedModel,
    timestamp: Date.now()
  });
}
```

### With Future ResponseRouterBrick
```typescript
// ResponseRouterBrick will handle dual storage automatically
const dualResponse = await dualResponseBrick.generate(request, llmService);
// ResponseRouterBrick listens to 'dual-response:generated' events
// Automatically routes normal_response to SuperJournal
// Automatically routes machine_trim to Journal bucket
```

## Essential Boss Rules Compliance

### Rule 4: LEGO Bricks ✅
- **Single Responsibility**: Dual response generation only
- **Standard Bus Connectors**: ConfigBus, EventBus, StateBus, ErrorBus
- **Complete Independence**: Works in isolation with mock buses
- **Natural Composability**: Events enable automatic integration

### Rule 3: Thin Wrapper ✅
- **Minimal Abstraction**: Direct LLM service usage with prompt enhancement
- **Platform Features Shine**: Full LLM service capabilities available
- **Native Error Handling**: LLM errors propagated naturally

### Rule 6: Don't Reinvent the Wheel ✅
- **Reuses LLMBrick**: Leverages existing LLM infrastructure
- **Standard Parsing**: Uses native string operations with robust error handling
- **Existing Patterns**: Follows established LEGO brick patterns

### Rule 8: No Hardcoding ✅
- **Externalized Configuration**: Prompts, delimiters, timeouts in JSON
- **Environment Agnostic**: Works with any LLM service
- **Configurable Behavior**: Fallback strategies, retry policies, compression targets

### Rule 5: Easy Removal ✅
**To remove DualResponseBrick completely:**
1. Delete `src/lib/bricks/DualResponseBrick/` folder
2. Remove DualResponseBrick imports from consuming code
3. Remove `aetherVault/config/DualResponseBrick.json`
4. System falls back to single response generation only

**Fallback Behavior**: System continues with normal responses only
**No Cascading Errors**: Other bricks continue functioning normally

### Rule 9: Debug with Discipline ✅
- **Extensive Logging**: All operations logged with clear emoji indicators
- **Preserve Error Handling**: Never removes try/catch for debugging
- **Non-Destructive Debugging**: Add instrumentation without changing core logic

## Usage Examples

### Basic Dual Response Generation
```typescript
const dualResponseBrick = new DualResponseBrick(eventBus, configBus, stateBus, errorBus);

const request = {
  user_message: "Explain photosynthesis",
  system_prompt: "You are Samara, a knowledgeable AI assistant...",
  persona: 'samara',
  model: 'claude-3-5-sonnet-20241022',
  timestamp: Date.now()
};

const result = await dualResponseBrick.generate(request, llmService);

if (result.success && result.response) {
  console.log('Normal:', result.response.normal_response);
  console.log('Machine Trim:', result.response.machine_trim.ai_response);
  console.log('Compression:', Math.round(result.response.generation_metadata.compression_ratio * 100) + '%');
}
```

### Error Handling with Fallback
```typescript
try {
  const result = await dualResponseBrick.generate(request, llmService);
  
  if (result.fallback_used) {
    console.log('⚠️ Using fallback: normal response only');
  }
  
} catch (error) {
  // DualResponseBrick publishes error events automatically
  // ErrorBus receives all errors
  // System continues working (graceful degradation)
}
```

### Event-Driven Integration
```typescript
// Listen for dual response completion
eventBus.subscribe('dual-response:generated', (event) => {
  if (event.success && event.compression_ratio) {
    console.log(`✅ Generated dual response with ${Math.round(event.compression_ratio * 100)}% compression`);
    // Trigger dual storage workflow
  }
});

// Listen for parsing failures
eventBus.subscribe('dual-response:fallback', (event) => {
  console.log('⚠️ Dual response parsing failed, using normal response only');
  // Continue with single storage workflow
});
```

### Runtime Configuration Updates
```typescript
// Update compression target based on performance metrics
await dualResponseBrick.updateConfiguration({
  compressionTarget: 0.5, // Aim for 50% compression
  debugMode: true,        // Enable detailed logging
  maxRetries: 3          // Increase retry attempts
});
```

## Performance Characteristics

### Generation Efficiency
- **Single LLM Call**: Both responses generated in one request
- **Prompt Injection**: Minimal overhead for dual-response instructions
- **Parallel Processing**: Parser works on LLM output without blocking

### Parsing Robustness  
- **Delimiter Detection**: Configurable delimiters with fallback handling
- **Compression Validation**: Ensures compression meets quality targets
- **Inferability Detection**: Automatic classification of machine trim types

### Fallback Strategies
- **Graceful Degradation**: System continues with normal responses if parsing fails
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Error Recovery**: Non-fatal errors don't break the system

## Future Extensions
- **Multi-Model Support**: Generate machine trims optimized for different models
- **Dynamic Prompting**: Adjust dual-response prompts based on conversation context
- **Quality Metrics**: Track compression effectiveness and semantic preservation
- **Batch Processing**: Generate dual responses for multiple messages simultaneously

---

**DualResponseBrick**: The bridge between conversational AI and efficient storage, enabling 60-80% storage reduction while preserving 100% semantic meaning through intelligent dual-response generation.