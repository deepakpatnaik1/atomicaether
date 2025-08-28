# JournalBrick Wire Documentation

## Purpose
LEGO Brick for storing machine-trimmed responses in the atomicaether-journal R2 bucket. Handles efficient storage and retrieval of compressed conversation data while preserving semantic meaning.

## Bus Connections

### ConfigBus
- **Loads**: `JournalBrick` configuration for bucket settings and R2 credentials
- **Fallback**: Robust defaults ensure functionality even without config file

### EventBus
- **Publishes**: 
  - `journal:initialized` - Initialization success/failure with bucket info
  - `journal:stored` - Machine trim storage completion (success/error)
  - `journal:deleted` - Machine trim deletion completion (success/error)

### StateBus
- **Sets**: 
  - `journal:initialized` - Boolean initialization status
  - `journal:bucket` - Current bucket name
  - `journal:error` - Last error message if initialization failed

### ErrorBus
- **Reports**: R2 connection failures, storage errors, credential issues
- **Severity**: Warning for operational errors, Fatal for initialization failures

## API

### Core Methods
```typescript
// Initialize with R2 credentials
await journalBrick.initialize();

// Store machine trim response
const result = await journalBrick.store(machineTrimResponse, {
  turnId: 'turn-123',
  persona: 'samara', 
  model: 'gpt-4o',
  timestamp: Date.now()
});

// Retrieve by turnId  
const entry = await journalBrick.retrieve('turn-123');

// Delete machine trim
const deleteResult = await journalBrick.delete('turn-123');

// List recent entries
const list = await journalBrick.list(50);
```

### Machine Trim Response Format
```typescript
interface MachineTrimResponse {
  user_message: string;
  ai_response: string; // Compressed according to machine trim rules
  inferability: "stored" | "inferable_acknowledgment" | "not_stored";
}
```

## Configuration
File: `/aetherVault/config/JournalBrick.json`
```json
{
  "bucketName": "atomicaether-journal",
  "region": "auto", 
  "endpoint": "${VITE_R2_ENDPOINT}",
  "dateOrganized": true,
  "retryAttempts": 3,
  "timeoutMs": 10000
}
```

## R2 Bucket Structure
```
atomicaether-journal/
  entries/
    2025/
      08/
        28/
          {turnId}.json  # Machine trim entries organized by date
```

## Environment Variables Required
- `VITE_R2_ACCESS_KEY_ID` - R2 access key
- `VITE_R2_SECRET_ACCESS_KEY` - R2 secret key  
- `VITE_R2_ENDPOINT` - R2 endpoint URL

## Integration Points

### With DualResponseBrick (Future)
```typescript
// DualResponseBrick will use JournalBrick to store machine trims
const dualResponse = await dualResponseBrick.process(userMessage);
await journalBrick.store(dualResponse.machine_trim, metadata);
```

### With SynchronizedDeletionBrick (Future)
```typescript
// Synchronized deletion across both SuperJournal and Journal
await synchronizedDeletionBrick.delete(turnId);
// Automatically calls both superJournalBrick.delete() AND journalBrick.delete()
```

## Essential Boss Rules Compliance

### Rule 4: LEGO Bricks ✅
- **Single Responsibility**: Machine trim storage only
- **Standard Bus Connectors**: ConfigBus, EventBus, StateBus, ErrorBus
- **Complete Independence**: Works in isolation with mock buses
- **Natural Composability**: Events enable automatic integration

### Rule 3: Thin Wrapper ✅
- **Minimal Abstraction**: Direct S3Client usage with thin convenience layer
- **Platform Features Shine**: Full AWS SDK capabilities available
- **Native Error Handling**: S3 errors propagated naturally

### Rule 8: No Hardcoding ✅
- **Externalized Configuration**: Bucket names, timeouts, retry policies in JSON
- **Environment Variables**: R2 credentials via env vars with substitution
- **Configurable Behavior**: Date organization, retry attempts, timeouts

### Rule 5: Easy Removal ✅
**To remove JournalBrick completely:**
1. Delete `src/lib/bricks/JournalBrick/` folder
2. Remove JournalBrick imports from consuming code
3. Remove `aetherVault/config/JournalBrick.json`
4. System continues working with SuperJournal only

**Fallback Behavior**: Dual-response system falls back to single storage (SuperJournal)
**No Cascading Errors**: Other bricks continue functioning normally

### Rule 9: Debug with Discipline ✅
- **Extensive Logging**: All operations logged with clear emoji indicators
- **Preserve Error Handling**: Never removes try/catch for debugging
- **Non-Destructive Debugging**: Add instrumentation without changing core logic

## Usage Examples

### Basic Storage and Retrieval
```typescript
const journalBrick = new JournalBrick();
await journalBrick.initialize();

// Store machine trim
const machineTrim = {
  user_message: "What is a comet?",
  ai_response: "comet: ice/dust/rock body orbiting Sun, develops coma/tail when near Sun from solar radiation",
  inferability: "stored"
};

await journalBrick.store(machineTrim, {
  turnId: 'turn-abc123',
  persona: 'samara',
  model: 'gpt-4o', 
  timestamp: Date.now()
});

// Retrieve later
const entry = await journalBrick.retrieve('turn-abc123');
console.log(entry?.ai_response); // Compressed response
```

### Error Handling
```typescript
try {
  await journalBrick.store(machineTrim, metadata);
} catch (error) {
  // JournalBrick publishes error events automatically
  // ErrorBus receives all errors
  // System continues working (graceful degradation)
}
```

### Event-Driven Integration
```typescript
// Listen for storage completion
eventBus.subscribe('journal:stored', (event) => {
  if (event.success) {
    console.log(`Machine trim stored for ${event.turnId}`);
  } else {
    console.warn(`Storage failed: ${event.error}`);
  }
});
```

## Performance Characteristics

### Storage Efficiency
- **Compression Ratio**: Typically 60-80% reduction from normal responses
- **Semantic Preservation**: 100% meaning retention despite size reduction
- **Batch Operations**: Parallel R2 operations for list/retrieve

### Network Optimization
- **Parallel Fetching**: Batch R2 operations where possible
- **Smart Key Generation**: Timezone-aware date organization for reliable retrieval
- **Retry Logic**: Configurable retry attempts for transient failures

## Future Extensions
- **Compression Metrics**: Track compression ratios and effectiveness
- **Search Indexing**: Index machine trims for semantic search
- **Backup Strategies**: Cross-region replication for durability
- **Analytics Integration**: Usage metrics and performance monitoring

---

**JournalBrick**: The foundation for efficient machine trim storage, preserving your weeks of linguistic rule development while providing massive storage efficiency for conversation memory systems.