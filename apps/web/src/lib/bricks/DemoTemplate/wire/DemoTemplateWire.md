# BRICK-704-DemoTemplate Wire Documentation

## Removal Instructions (Rule 5)
To remove DemoTemplate completely:
1. Delete the `apps/web/src/lib/bricks/DemoTemplate/` folder
2. Remove `create-demo` script from `package.json`
3. Delete `aetherVault/config/demoTemplate.json`

**Result**: Existing demos continue working. Can no longer generate new demos via CLI.

## Integration Points
- package.json - `create-demo` script
- aetherVault/config/demoTemplate.json - Configuration file

## Events
**Publishes:**
- `demo:created` - When a new demo is successfully generated
  - Payload: `{ name: string, path: string }`

**Subscribes to:** None

## Dependencies
- ConfigBus - Loads template configuration
- EventBus - Publishes creation events
- ErrorBus - Reports generation failures

## API
```typescript
const template = new DemoTemplate();
await template.init();

// Generate demo component string
const content = template.generateDemoComponent({
  name: 'my-feature',
  series: '100s',
  category: 'Buses',
  description: 'Demo for my feature',
  tags: ['demo', 'feature'],
  status: 'wip'
});

// Get output path for a demo
const path = template.getOutputPath('my-feature');
```

## CLI Usage
```bash
npm run create-demo <name>
```

Creates a new demo at `src/routes/demo/<name>/+page.svelte` with:
- All standard sections (actions, state, output, debug, reset)
- Metadata for discovery
- Consistent styling
- Boilerplate test methods

## Configuration
The template is configured via `aetherVault/config/demoTemplate.json`:
- `outputPath` - Where demos are created
- `templateSections` - Which sections to include
- `defaultMetadata` - Default values for new demos
- `styling` - CSS class names