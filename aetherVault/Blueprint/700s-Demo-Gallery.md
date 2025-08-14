# BRICK-704-DemoTemplate Documentation

## One Line
CLI template generator that creates consistent demo boilerplate for testing bricks in isolation.

## Integration
```bash
npm run create-demo <brick-name>
```
or programmatically:
```typescript
import { DemoTemplate } from '$lib/bricks/DemoTemplate';
const template = new DemoTemplate();
await template.init();
const code = template.generateDemoComponent(options);
```

## Removal (Rule 5)

1. Delete apps/web/src/lib/bricks/DemoTemplate/ folder
2. Remove "create-demo" script from apps/web/package.json
3. Delete aetherVault/config/demoTemplate.json

Result: Existing demos continue working. Cannot generate new demos via CLI.

## Events

Publishes:
  - None currently (will publish demo:created when EventBus is available)

Subscribes to:
  - None

## Config

aetherVault/config/demoTemplate.json
```json
{
    "outputPath": "src/routes/demo/{name}",  // Where demos are created
    "templateSections": {                     // Which sections to include
        "actions": true,
        "state": true,
        "output": true,
        "debug": true,
        "reset": true
    },
    "defaultMetadata": {                      // Default demo metadata
        "series": "000s",
        "status": "wip",
        "category": "uncategorized"
    }
}
```

## Dependencies

  - None (temporarily loads config via fetch until ConfigBus is available)

## API

```typescript
template.init(): Promise<void>                          // Initialize with config
template.generateDemoComponent(options): string         // Generate demo code
template.getOutputPath(name): string                    // Get demo file path
```

## Testing

```bash
# Test CLI generation
npm run create-demo test-feature

# Visit demo of the generator itself
http://localhost:5173/demo/demo-template
```

## Notes

- CLI script is standalone JavaScript to avoid TypeScript compilation issues
- Generated demos include TODO comments where implementation is needed
- Each demo gets metadata for future discovery by DemoRegistry
- The demo-template demo is meta - it demos the demo generator itself