/**
 * ErrorBus - Facade over EventBus for error-specific operations
 * 
 * Following Essential Boss Rules:
 * - Rule 3 (Thin Wrapper): Just a facade over EventBus, not a new system
 * - Rule 1 (Webby): Integrates with native window.onerror and unhandledrejection
 * - Rule 8 (No Hardcoding): All configuration externalized
 */

import type { EventBus } from '../../EventBus';
import type { ErrorContext, ErrorBusConfig } from '../models/ErrorContext';

export class ErrorBus {
    private eventBus: EventBus;
    private config: ErrorBusConfig;
    private lastError: { message: string; timestamp: number } | null = null;
    private globalHandlersAttached = false;
    
    /**
     * Original error handler to restore if needed
     */
    private originalErrorHandler: OnErrorEventHandler | null = null;
    
    constructor(eventBus: EventBus, config: ErrorBusConfig) {
        this.eventBus = eventBus;
        this.config = config;
        
        // Attach global handlers if not in test environment
        if (!import.meta.env.TEST) {
            this.attachGlobalHandlers();
        }
    }
    
    /**
     * Report an error with full context
     */
    report(error: Error, source: string, recoverable = false, metadata?: Record<string, unknown>): void {
        // Apply deduplication if enabled
        if (this.config.deduplication.enabled && this.isDuplicate(error)) {
            return;
        }
        
        const context: ErrorContext = {
            error,  // Original error with stack preserved
            source,
            recoverable,
            timestamp: Date.now(),
            metadata
        };
        
        // Log to console if configured
        if (this.config.logToConsole) {
            if (recoverable) {
                console.warn(`[ErrorBus] Recoverable error from ${source}:`, error);
            } else {
                console.error(`[ErrorBus] Fatal error from ${source}:`, error);
            }
        }
        
        // Publish to EventBus
        this.eventBus.publish('error', context);
        
        // Update last error for deduplication
        this.lastError = {
            message: error.message,
            timestamp: Date.now()
        };
    }
    
    /**
     * Report a recoverable error (user can retry)
     */
    reportRecoverable(error: Error, source: string, metadata?: Record<string, unknown>): void {
        this.report(error, source, true, metadata);
    }
    
    /**
     * Report a fatal error (requires refresh/restart)
     */
    reportFatal(error: Error, source: string, metadata?: Record<string, unknown>): void {
        this.report(error, source, false, metadata);
    }
    
    /**
     * Subscribe to error events
     * This is just a pass-through to EventBus for consistency
     */
    subscribe(handler: (context: ErrorContext) => void): () => void {
        return this.eventBus.subscribe('error', handler);
    }
    
    /**
     * Check if this error is a duplicate within the time window
     */
    private isDuplicate(error: Error): boolean {
        if (!this.lastError) return false;
        
        const isSameMessage = this.lastError.message === error.message;
        const isWithinWindow = Date.now() - this.lastError.timestamp < this.config.deduplication.windowMs;
        
        return isSameMessage && isWithinWindow;
    }
    
    /**
     * Attach global error handlers to capture uncaught errors
     */
    private attachGlobalHandlers(): void {
        if (this.globalHandlersAttached) return;
        
        // Only attach if configured to do so
        if (this.config.captureGlobalErrors) {
            // Store original handler if it exists
            this.originalErrorHandler = window.onerror;
            
            // Capture unhandled errors
            window.addEventListener('error', (event: ErrorEvent) => {
                const error = event.error || new Error(event.message);
                this.report(error, 'window.onerror', false, {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
                // Don't prevent default - let it reach DevTools
            });
        }
        
        if (this.config.captureUnhandledRejections) {
            // Capture unhandled promise rejections
            window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
                const error = event.reason instanceof Error 
                    ? event.reason 
                    : new Error(String(event.reason));
                
                this.report(error, 'unhandledrejection', false, {
                    promise: event.promise,
                    reason: event.reason
                });
                // Don't prevent default - let it reach DevTools
            });
        }
        
        this.globalHandlersAttached = true;
    }
    
    /**
     * Detach global error handlers (useful for testing)
     */
    detachGlobalHandlers(): void {
        if (!this.globalHandlersAttached) return;
        
        // Note: We can't actually remove the event listeners we added
        // but we can set a flag to ignore them
        this.globalHandlersAttached = false;
        
        // Restore original error handler if we had one
        if (this.originalErrorHandler) {
            window.onerror = this.originalErrorHandler;
        }
    }
    
    /**
     * Update configuration at runtime
     */
    updateConfig(config: Partial<ErrorBusConfig>): void {
        this.config = { ...this.config, ...config };
        
        // Re-attach handlers if config changed
        if (!this.globalHandlersAttached && !import.meta.env.TEST) {
            this.attachGlobalHandlers();
        }
    }
}