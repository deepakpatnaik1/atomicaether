# Rule 6: Don't Reinvent the Wheel - Someone Already Solved This

**The Principle**: Every feature you're building and every bug you're debugging has already been implemented or fixed by someone, somewhere. Search first, build second.

### The Reality Check

```typescript
// ❌ REINVENTING: Spending hours building custom solutions
class CustomDebounce {
    private timeout: NodeJS.Timeout;
    private delay: number;
    
    constructor(fn: Function, delay: number) {
        // 50 lines of custom debounce logic...
        // Edge cases you haven't thought of...
        // Bugs that were fixed in lodash 10 years ago...
    }
}

// ✅ SMART: Someone already perfected this
import { debounce } from 'lodash-es';
// Or even better, use native platform solutions when available
```

### The Search-First Workflow

**Before writing ANY feature:**

1. **Check Context7 for the latest**
   - Search Context7 for current best practices
   - Get up-to-date framework-specific solutions
   - Find recent implementation patterns
   
2. **Search for existing implementations**
   ```
   "svelte 5 infinite scroll"
   "typescript event bus implementation"
   "sveltekit auth middleware"
   site:github.com "hono rate limiting"
   ```

3. **Check battle-tested libraries**
   - npm trends for popularity
   - GitHub issues for common problems
   - Bundle size considerations
   - Last update date

4. **Look for platform-native solutions**
   ```typescript
   // Don't build a custom observer pattern
   const observer = new IntersectionObserver(); // Native!
   
   // Don't write custom date formatting
   new Intl.DateTimeFormat(); // Native!
   
   // Don't implement custom debouncing for inputs
   <input on:input={debounce(handler, 300)} /> // Svelte has it!
   ```

### Real Examples

**Example 1: Implementing Authentication**
```typescript
// ❌ REINVENTING: Building from scratch
class AuthSystem {
    hashPassword() { /* Custom crypto - probably insecure */ }
    generateToken() { /* Custom JWT - probably buggy */ }
    validateSession() { /* Custom logic - probably incomplete */ }
}

// ✅ SMART: Use battle-tested solutions
// Search: "sveltekit auth" → Find Auth.js (formerly NextAuth)
// Search: "hono jwt middleware" → Find @hono/jwt
import { SvelteKitAuth } from '@auth/sveltekit';
import { GitHub } from '@auth/core/providers/github';
```

**Example 2: Implementing WebSocket Reconnection**
```typescript
// ❌ REINVENTING: Custom reconnection logic
class WebSocketManager {
    private reconnectAttempts = 0;
    private backoffDelay = 1000;
    // 200 lines of complex state management...
}

// ✅ SMART: Someone solved this perfectly
// Search: "websocket reconnecting client" → Find 'reconnecting-websocket'
import ReconnectingWebSocket from 'reconnecting-websocket';
```

**Example 3: Debugging CORS Issues**
```typescript
// ❌ REINVENTING: Random header attempts
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    // Missing 20 other cases...
});

// ✅ SMART: Search "hono cors middleware"
import { cors } from 'hono/cors';
app.use('*', cors()); // Handles all edge cases
```

### The Search Patterns

**Start with Context7:**
- Get current best practices and modern patterns
- Find framework-specific guidance
- Discover latest community solutions

**For Features:**
- `"[framework] [feature]"` - "sveltekit file upload"
- `"best [feature] library [year]"` - "best typescript validation library 2024"
- `site:github.com "[feature]" stars:>100` - Quality implementations
- `"[feature] example"` - Find working code

**For Bugs:**
- Copy the exact error message into Google
- `"[error message]" site:stackoverflow.com`
- `"[framework] [error message]" site:github.com/issues`
- Check the framework's GitHub issues directly

**For Performance:**
- `"[operation] performance comparison"`
- `"fastest way to [operation] javascript"`
- Look for JSPerf comparisons
- Check Web.dev for platform best practices

### The Library Selection Criteria

When you find existing solutions, evaluate:

1. **Popularity & Maintenance**
   - Weekly downloads on npm
   - Last commit date
   - Open issues ratio
   - Response time on issues

2. **Size & Dependencies**
   ```bash
   # Check bundle impact
   npx bundlephobia [package-name]
   ```

3. **Platform Alignment**
   - Prefer solutions using Web APIs
   - Check for framework-specific versions
   - Ensure TypeScript support

4. **License Compatibility**
   - MIT, Apache 2.0, BSD = usually safe
   - GPL = check with legal
   - No license = avoid

### When to Build Custom

Only build custom when:
1. **No solution exists** (extremely rare)
2. **All solutions are outdated** (> 2 years, many issues)
3. **Specific business logic** that can't be generalized
4. **Performance critical** and measured bottleneck

Even then:
- Start with the closest existing solution
- Fork and modify rather than build from scratch
- Document why custom was necessary

### The Benefits

- **Time saved**: Hours → minutes
- **Bugs avoided**: Solved edge cases you didn't know existed
- **Best practices**: Learn from community solutions
- **Maintenance**: Upstream fixes benefit you
- **Documentation**: Usually better than what you'd write

### The Search-First Checklist

Before implementing anything:
- [ ] Checked Context7 for latest patterns?
- [ ] Searched for existing implementations?
- [ ] Checked if platform has native solution?
- [ ] Looked at how popular projects solve it?
- [ ] Evaluated at least 3 alternatives?
- [ ] Confirmed no battle-tested library exists?

### Remember

Every line of code you write is a liability. Every library you use is an asset (if chosen wisely). The best code is code you didn't have to write because someone already perfected it.

Your job isn't to prove you can build everything from scratch. Your job is to deliver value quickly by standing on the shoulders of giants.