# ConfigBus Wire Documentation

## Purpose
ConfigBus is the configuration heart of the atomicaether system, enabling Rule 8 (No Hardcoding) by externalizing all configuration to JSON files. It provides type-safe config loading with environment variable substitution and hot reload in development.

## Core Philosophy
**Every configurable value lives in JSON files.** ConfigBus makes these configs type-safe, reactive, and hot-reloadable during development.

## Architecture

### Dual Loading Strategy
- **Development**: Runtime fetch from `/config/*.json` - enables hot reload
- **Production**: Build-time bundling via dynamic imports - optimized performance

```typescript
// Automatically chooses the right strategy
const config = await configBus.load('app');
```

### Environment Variable Substitution
Supports `${VAR_NAME:-default_value}` syntax in JSON files:

```json
{
    "apiUrl": "${VITE_API_URL:-http://localhost:3001}",
    "environment": "${VITE_APP_ENV:-development}"
}
```

Variables are resolved from `import.meta.env` at runtime, even in bundled configs.

### Type Safety
All configs are fully typed via the ConfigMap interface:

```typescript
interface ConfigMap {
    'app': AppConfig;
    'personas': PersonaConfig[];
}

// Fully typed!
const app = await configBus.load('app');
console.log(app.features.voiceInput); // TypeScript knows this exists
```

## Integration Pattern

### Extending ConfigMap
Each brick extends ConfigMap with its config types:

```typescript
declare module '$lib/buses/ConfigBus/models/ConfigMap' {
    interface ConfigMap {
        'myBrick': {
            enabled: boolean;
            apiKey: string;
            maxRetries: number;
        };
    }
}
```

### Loading Configurations
```typescript
import { configBus } from '$lib/buses';

// Load with caching
const config = await configBus.load('myBrick');

// Force reload
const fresh = await configBus.load('myBrick', { forceReload: true });

// Load multiple configs
const configs = await configBus.loadMany(['app', 'personas']);

// Check if cached
if (configBus.has('app')) {
    const cached = configBus.get('app');
}
```

### Config File Location
All config files live in `aetherVault/config/`:
```
aetherVault/
└── config/
    ├── app.json
    ├── eventBus.json
    ├── errorBus.json
    └── personas.json
```

## Hot Reload (Development Only)
In development, ConfigBus can watch config files and reload them automatically:

```typescript
// Enable watching
await configBus.load('app', { watch: true });

// Listen for reload events
eventBus.subscribe('config:reloaded', ({ key, config }) => {
    console.log(`Config ${key} reloaded:`, config);
});
```

## Environment Variables

### Naming Convention
- Use `VITE_` prefix for client-side env vars
- Examples: `VITE_API_URL`, `VITE_APP_ENV`

### Default Values
Always provide defaults in configs:
```json
"${VITE_API_URL:-http://localhost:3001}"
```

### Security Note
Never put secrets in client-side configs! ConfigBus runs in the browser.

## Caching Strategy
- Configs are cached after first load
- Use `forceReload: true` to bypass cache
- `clearAll()` to reset all cached configs
- Cache persists for app lifetime (no TTL)

## EventBus Integration
ConfigBus publishes events for config lifecycle:
- `config:loaded` - Config successfully loaded
- `config:error` - Config load failed
- `config:reloaded` - Config hot reloaded (dev)
- `config:cleared` - Cache cleared

## Performance Considerations
- **Dev**: Network fetch per config (enables hot reload)
- **Prod**: Bundled with app (zero runtime cost)
- Configs are cached after first load
- Parallel loading with `loadMany()`

## Testing Strategy
- Mock fetch for runtime loader tests
- Test env var substitution patterns
- Test caching behavior
- Verify type safety at compile time

## Debug Tools
In development:
```javascript
window.__configBus.keys()         // List cached configs
window.__configBus.get('app')     // Get cached config
window.__configBus.reload('app')  // Force reload
window.__configBus.clearAll()     // Clear all cache
```

## Removal Impact
If ConfigBus is removed:
1. All configuration becomes hardcoded
2. No runtime config changes
3. Environment-specific builds required
4. No hot reload for configs
5. Loss of type safety for configs

The app continues to function but loses all configuration flexibility.

## Best Practices
1. **Always provide defaults** for env vars
2. **Keep secrets server-side** - never in client configs
3. **Use descriptive config keys** matching filenames
4. **Version your configs** if they have breaking changes
5. **Document config schemas** in TypeScript interfaces

## Future Considerations
- Config validation with Zod schemas
- Config versioning and migration
- Server-side config API for sensitive values
- Config editor UI for non-developers