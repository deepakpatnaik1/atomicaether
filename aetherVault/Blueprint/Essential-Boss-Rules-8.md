# Rule 8: No Hardcoding - Everything Lives in Config

**The Principle**: Every value, setting, string, URL, color, size, and constant lives in configuration files. If you're typing a value directly in code, you're doing it wrong.

### The Cardinal Sin

```typescript
// ❌ HARDCODING: Values buried in code
class MessageBrick {
    private readonly MAX_LENGTH = 5000;  // Why 5000? Who decided?
    private readonly API_URL = 'https://api.example.com';  // What about staging?
    private readonly RETRY_COUNT = 3;  // Can't change without deploy
    
    async sendMessage(text: string) {
        if (text.length > 5000) {  // Magic number!
            throw new Error('Message too long');  // Hardcoded string!
        }
        
        const response = await fetch('https://api.example.com/messages', {
            timeout: 30000,  // Hidden timeout value!
            headers: {
                'X-Client-Version': '1.0.0'  // Hardcoded version!
            }
        });
    }
}

// ✅ CONFIG-DRIVEN: Everything externalized
class MessageBrick {
    private config: MessageConfig;
    
    async init() {
        this.config = await this.configBus.load<MessageConfig>('messages');
    }
    
    async sendMessage(text: string) {
        if (text.length > this.config.maxLength) {
            throw new Error(this.config.errors.tooLong);
        }
        
        const response = await fetch(`${this.config.apiUrl}/messages`, {
            timeout: this.config.timeout,
            headers: {
                'X-Client-Version': this.config.version
            }
        });
    }
}
```

### What Must Be in Config

**Everything. Literally Everything.**

```json
// config/messages.json
{
    "maxLength": 5000,
    "minLength": 1,
    "timeout": 30000,
    "retryCount": 3,
    "retryDelay": 1000,
    "apiUrl": "${API_BASE_URL}/messages",
    "version": "${APP_VERSION}",
    "errors": {
        "tooLong": "Message exceeds maximum length of {maxLength} characters",
        "tooShort": "Message must be at least {minLength} characters",
        "networkError": "Unable to send message. Please check your connection.",
        "serverError": "Server error. Please try again."
    },
    "ui": {
        "placeholder": "Type a message...",
        "sendButton": "Send",
        "sending": "Sending...",
        "charactersRemaining": "{remaining} characters left"
    },
    "features": {
        "markdown": true,
        "mentions": true,
        "attachments": false,
        "reactions": true
    },
    "styling": {
        "maxHeight": "400px",
        "borderRadius": "8px",
        "padding": "12px",
        "fontSize": "16px"
    }
}
```

### The Config Categories

**API Configuration**
```json
{
    "endpoints": {
        "base": "${API_URL}",
        "auth": "/auth",
        "messages": "/messages",
        "personas": "/personas"
    },
    "timeouts": {
        "default": 30000,
        "upload": 120000,
        "longPoll": 300000
    }
}
```

**Feature Flags**
```json
{
    "features": {
        "voiceInput": false,
        "cloudSync": true,
        "offlineMode": true,
        "betaFeatures": "${ENABLE_BETA}"
    }
}
```

**UI Text (i18n ready)**
```json
{
    "text": {
        "welcome": "Welcome to AtomicAether",
        "errors": {
            "generic": "Something went wrong",
            "network": "Connection lost",
            "auth": "Please sign in"
        },
        "actions": {
            "save": "Save",
            "cancel": "Cancel",
            "delete": "Delete"
        }
    }
}
```

**Styling Values**
```json
{
    "theme": {
        "colors": {
            "primary": "#007AFF",
            "danger": "#FF3B30",
            "success": "#34C759"
        },
        "spacing": {
            "xs": "4px",
            "sm": "8px",
            "md": "16px",
            "lg": "24px"
        },
        "animations": {
            "duration": "200ms",
            "easing": "cubic-bezier(0.4, 0, 0.2, 1)"
        }
    }
}
```

### Environment Variable Integration

```json
// config/app.json
{
    "api": {
        "url": "${API_URL:-http://localhost:3001}",
        "key": "${API_KEY}",
        "timeout": "${API_TIMEOUT:-30000}"
    },
    "features": {
        "debug": "${DEBUG:-false}",
        "analytics": "${ENABLE_ANALYTICS:-true}"
    }
}
```

### The Implementation Pattern

```typescript
// 1. Define typed config interface
interface PersonaConfig {
    maxPersonas: number;
    defaultPersona: string;
    switchAnimation: boolean;
    ui: {
        dropdownPosition: 'top' | 'bottom';
        showDescriptions: boolean;
    };
}

// 2. Load at initialization
class PersonaBrick {
    private config: PersonaConfig;
    
    async init() {
        this.config = await this.configBus.load<PersonaConfig>('personas');
    }
    
    // 3. Use throughout
    canAddPersona(): boolean {
        return this.personas.length < this.config.maxPersonas;
    }
}
```

### Config Hot Reloading

```typescript
// Development: Configs reload without restart
class ConfigBus {
    private watchers = new Map<string, FileWatcher>();
    
    async load<T>(name: string): Promise<T> {
        if (import.meta.env.DEV) {
            this.watchForChanges(name);
        }
        return this.loadConfig<T>(name);
    }
    
    private watchForChanges(name: string) {
        const watcher = new FileWatcher(`/config/${name}.json`);
        watcher.on('change', () => {
            this.eventBus.publish(new ConfigChangedEvent(name));
        });
    }
}
```

### The "But What About..." Answers

**"But constants never change!"**
```typescript
// ❌ WRONG: They always do
const MAX_FILE_SIZE = 10485760;  // 10MB... until it needs to be 20MB

// ✅ RIGHT: Everything changes
config.upload.maxFileSize  // Changed without deploying
```

**"But it's just one string!"**
```typescript
// ❌ WRONG: Strings multiply
throw new Error('Invalid input');  // Soon you have 50 hardcoded errors

// ✅ RIGHT: Centralized strings
throw new Error(config.errors.invalidInput);  // All strings in one place
```

**"But it's a technical value!"**
```typescript
// ❌ WRONG: Technical values change too
const DEBOUNCE_MS = 300;  // Until UX wants 500ms

// ✅ RIGHT: Everything is configurable
config.ui.debounceDelay  // Tunable without code changes
```

### Config Organization

```
config/
├── app.json          # Global app settings
├── api.json          # API endpoints and settings
├── auth.json         # Authentication config
├── theme.json        # Colors, spacing, typography
├── features.json     # Feature flags
├── errors.json       # Error messages
├── ui/              # UI-specific configs
│   ├── messages.json
│   ├── personas.json
│   └── navigation.json
└── i18n/            # Internationalization
    ├── en.json
    └── es.json
```

### The Config-First Checklist

Before writing any value in code:
- [ ] Is this in a config file?
- [ ] Is it in the right config file?
- [ ] Is it properly typed?
- [ ] Can it use environment variables?
- [ ] Is it documented?
- [ ] Will hot-reload work?

### Benefits of Config-Driven

1. **Change without deploy** - Adjust values instantly
2. **Environment-specific** - Different configs for dev/staging/prod
3. **A/B testing ready** - Swap configs to test variants
4. **White-labeling** - Reskin by changing config
5. **Debugging** - See all settings in one place
6. **Onboarding** - New devs understand from config

### The Ultimate Test

Can you:
- Change every color without touching code?
- Modify all text without touching code?
- Adjust every timeout without touching code?
- Toggle every feature without touching code?
- Switch APIs without touching code?

If not, you're still hardcoding.

### Remember

Code is logic. Config is values. Never mix them. Your code should be a machine that processes configuration, not a place where values live. Every hardcoded value is a future bug report waiting to happen.