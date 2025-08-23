/**
 * Application-wide event type map
 * 
 * This centralizes all event types for type safety across the app.
 * Each brick can extend this via TypeScript module augmentation.
 * 
 * Following Rule 4 (LEGO): Bricks declare their events here without
 * knowing about each other - just the event contract.
 */

// Import system events
import type { 
    AppReadyEvent,
    ErrorEvent,
    DebugModeEvent
} from '../events';

/**
 * Core application event map
 * Bricks will augment this interface to add their own events
 */
export interface AppEventMap {
    // System events
    'app:ready': {
        timestamp: number;
    };
    'error': {
        error: Error;
        source?: string;
        recoverable?: boolean;
    };
    'debug:mode': {
        enabled: boolean;
    };
    
    // InputBar events
    'input:submit': {
        text: string;
        fileUrls: string[];
        files: Array<{ name: string; type: string; size: number }>;
        model: string;
        persona: string;
        timestamp: number;
    };
    
    // LLM events
    'llm:ready': {
        models: any[];
        currentModel: string;
    };
    'llm:response:start': {
        messageId: string;
        model: string;
        persona: string;
        timestamp: number;
    };
    'llm:response:chunk': {
        messageId: string;
        chunk: string;
        timestamp: number;
    };
    'llm:response:complete': {
        messageId: string;
        fullResponse: string;
        model: string;
        timestamp: number;
    };
    'llm:response:error': {
        messageId: string;
        error: string;
        model: string;
        timestamp: number;
    };
    'llm:error': {
        error: string;
        model: string;
    };
    
    // Model events
    'model:change': {
        model: string;
    };
    'model:changed': {
        model: string;
    };
    
    // Streaming events
    'streaming:toggle': {
        enabled: boolean;
    };
    
    // Message events  
    'message:sent': {
        content: string;
        persona: string;
    };
    'message:received': {
        content: string;
        model: string;
    };
    
    // Theme events
    'theme:selected': {
        name: string | null;
        theme: any;
    };
    
    // Error display events
    'error:show': {
        message: string;
        type: string;
    };
}

/**
 * Module augmentation example for bricks:
 * 
 * declare module '$lib/buses/EventBus/types/EventMap' {
 *     interface AppEventMap {
 *         'persona:changed': {
 *             persona: string;
 *             previousPersona?: string;
 *         };
 *     }
 * }
 */