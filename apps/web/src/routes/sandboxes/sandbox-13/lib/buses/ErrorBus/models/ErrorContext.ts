/**
 * ErrorContext - Standard structure for error events
 * 
 * Following Rule 8 (No Hardcoding): This interface defines the
 * error contract without hardcoding any values
 */

/**
 * Standard error context that flows through ErrorBus
 */
export interface ErrorContext {
    /**
     * The original Error object with stack trace preserved
     * Never modify this - DevTools needs the original
     */
    error: Error;
    
    /**
     * Which brick/component reported this error
     * Examples: 'PersonaBrick', 'MessageStore', 'window.onerror'
     */
    source: string;
    
    /**
     * Can the user retry this operation?
     * true = Show retry button, temporary issue
     * false = Fatal error, need refresh/restart
     */
    recoverable: boolean;
    
    /**
     * When the error occurred (Date.now())
     */
    timestamp: number;
    
    /**
     * Optional additional context
     * Could include user action, state snapshot, etc.
     */
    metadata?: Record<string, unknown>;
}

/**
 * Configuration for ErrorBus behavior
 */
export interface ErrorBusConfig {
    captureGlobalErrors: boolean;
    captureUnhandledRejections: boolean;
    logToConsole: boolean;
    deduplication: {
        enabled: boolean;
        windowMs: number;
    };
}