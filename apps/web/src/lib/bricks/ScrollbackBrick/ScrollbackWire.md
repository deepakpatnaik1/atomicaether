# ScrollbackBrick Wiring Guide

## Purpose
ScrollbackBrick displays conversation message history with proper theming and auto-scroll behavior.

## Installation

### 1. Import the brick
```typescript
import { ScrollbackBrick, ScrollbackUI } from '$lib/bricks/ScrollbackBrick';
```

### 2. Create the brick instance
```typescript
const scrollbackBrick = new ScrollbackBrick(
  eventBus,
  configBus,
  stateBus,
  errorBus
);
```

### 3. Add to your Svelte component
```svelte
<ScrollbackUI brick={scrollbackBrick} />
```

## Events

### Listens For
- `message:sent` - When user sends a message
  ```typescript
  { content: string, persona?: string }
  ```
- `message:received` - When assistant responds
  ```typescript
  { content: string, model?: string }
  ```
- `message:stream:start` - Begin streaming response
  ```typescript
  { messageId: string, model?: string }
  ```
- `message:stream:chunk` - Streaming content chunk
  ```typescript
  { messageId: string, chunk: string }
  ```
- `message:stream:end` - Complete streaming
  ```typescript
  { messageId: string, finalContent: string }
  ```
- `conversation:loaded` - Load existing conversation
  ```typescript
  { conversationId: string, messages: Message[] }
  ```
- `conversation:clear` - Clear all messages

### Publishes
- `scrollback:ready` - Brick initialized
  ```typescript
  { conversationId: string }
  ```
- `scrollback:scrolled` - User scrolled
  ```typescript
  { scrollPosition: number, isAtBottom: boolean }
  ```
- `message:clicked` - Message clicked
  ```typescript
  { message: Message }
  ```
- `message:copied` - Message copied
  ```typescript
  { message: Message }
  ```
- `scrollback:cleared` - Messages cleared
  ```typescript
  { oldConversationId: string }
  ```

## Configuration

### Required Config Files
1. `aetherVault/config/scrollback.json`
```json
{
  "maxMessages": 100,
  "autoScroll": true,
  "showTimestamps": true,
  "showMetadata": true,
  "groupByTime": false,
  "timeGroupingMinutes": 5
}
```

2. Theme file must include scrollback section:
```json
{
  "scrollback": {
    "layout": { /* dimensions */ },
    "typography": { /* fonts */ },
    "message": { /* colors */ },
    "roleLabel": { /* badges */ }
  }
}
```

## State Management
ScrollbackBrick stores conversation state in StateBus under key `currentConversation`.

## Complete Removal (Rule 5)

### 1. Stop the brick
```typescript
scrollbackBrick.destroy();
```

### 2. Remove from component
Delete `<ScrollbackUI brick={scrollbackBrick} />` from your Svelte file.

### 3. Remove imports
Delete the import statement for ScrollbackBrick.

### 4. Clean up state
```typescript
await stateBus.delete('currentConversation');
```

### 5. Remove config files (optional)
- Delete `aetherVault/config/scrollback.json`
- Remove `scrollback` section from theme files

## Testing Integration

### Send a test message
```typescript
eventBus.publish({
  type: 'message:sent',
  detail: {
    content: 'Hello, world!',
    persona: 'User'
  }
});
```

### Simulate assistant response
```typescript
eventBus.publish({
  type: 'message:received',
  detail: {
    content: 'Hello! How can I help you?',
    model: 'gpt-4'
  }
});
```

## Troubleshooting

### Messages not appearing
- Check EventBus is properly connected
- Verify events are using correct type strings
- Ensure ConfigBus can load theme files

### Styling issues
- Verify theme file has complete scrollback section
- Check theme is loaded before rendering

### Auto-scroll not working
- Check `autoScroll` is true in config
- Verify scroll container height is set correctly

## Dependencies
- EventBus for message events
- ConfigBus for theme and settings
- StateBus for conversation persistence
- ErrorBus for error reporting