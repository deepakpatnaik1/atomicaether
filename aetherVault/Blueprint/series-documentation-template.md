# BRICK-XXX-[BrickName] Documentation

## One Line
[Single sentence describing what this brick does]

## Integration
import { brickName } from '$lib/bricks/BrickName';
// or
eventBus.subscribe('[event:name]', handler);

## Removal (Rule 5)

1. Delete src/lib/bricks/BRICK-XXX-BrickName/ folder
2. [Specific integration point to remove]
3. Delete aetherVault/config/brickName.json

Result: [What still works, what functionality is lost]

## Events

Publishes:
  - event:name - When/why fired, payload shape

Subscribes to:
  - event:name - What it does with this event

## Config

aetherVault/config/brickName.json
  {
      "key": "value"  // What this controls
  }

## Dependencies

  - [List any bricks this depends on, should usually be "None"]

## API

[Only for bricks that expose methods/services]
brickName.method(param): ReturnType

## Testing

npm test -- BrickName
[Any special testing notes]

## Notes

[Any gotchas, special cases, or important context - keep it short]

That's it. No philosophy, no lengthy explanations. Just:
  1. What it does (one line)
  2. How to use it (integration)
  3. How to remove it (removal)
  4. What events flow through it
  5. What config controls it
  6. Any methods it exposes
  7. How to test it
