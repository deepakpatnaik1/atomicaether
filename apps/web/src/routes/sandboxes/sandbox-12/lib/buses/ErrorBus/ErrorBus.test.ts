/**
 * ErrorBus unit tests
 * 
 * Testing the facade behavior, deduplication, and global handlers
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorBus } from './core/ErrorBus';
import { EventBus } from '../EventBus/core/EventBus';
import type { ErrorContext, ErrorBusConfig } from './models/ErrorContext';

describe('ErrorBus', () => {
    let eventBus: EventBus;
    let errorBus: ErrorBus;
    let config: ErrorBusConfig;
    
    beforeEach(() => {
        // Create fresh instances for each test
        eventBus = new EventBus();
        config = {
            captureGlobalErrors: false, // Disabled for tests
            captureUnhandledRejections: false,
            logToConsole: false, // Don't spam test output
            deduplication: {
                enabled: true,
                windowMs: 100
            }
        };
        errorBus = new ErrorBus(eventBus, config);
    });
    
    afterEach(() => {
        vi.clearAllMocks();
    });
    
    describe('Basic error reporting', () => {
        it('should report errors through EventBus', () => {
            const handler = vi.fn();
            eventBus.subscribe('error', handler);
            
            const error = new Error('Test error');
            errorBus.report(error, 'TestSource', false);
            
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    error,
                    source: 'TestSource',
                    recoverable: false,
                    timestamp: expect.any(Number)
                })
            );
        });
        
        it('should report recoverable errors', () => {
            const handler = vi.fn();
            errorBus.subscribe(handler);
            
            const error = new Error('Recoverable error');
            errorBus.reportRecoverable(error, 'TestSource');
            
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    error,
                    source: 'TestSource',
                    recoverable: true
                })
            );
        });
        
        it('should report fatal errors', () => {
            const handler = vi.fn();
            errorBus.subscribe(handler);
            
            const error = new Error('Fatal error');
            errorBus.reportFatal(error, 'TestSource');
            
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    error,
                    source: 'TestSource',
                    recoverable: false
                })
            );
        });
        
        it('should include metadata when provided', () => {
            const handler = vi.fn();
            errorBus.subscribe(handler);
            
            const error = new Error('Error with metadata');
            const metadata = { userId: 123, action: 'save' };
            errorBus.report(error, 'TestSource', true, metadata);
            
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    error,
                    metadata
                })
            );
        });
    });
    
    describe('Error deduplication', () => {
        it('should deduplicate identical errors within time window', () => {
            const handler = vi.fn();
            errorBus.subscribe(handler);
            
            const error = new Error('Duplicate error');
            
            // Report same error multiple times quickly
            errorBus.report(error, 'TestSource', false);
            errorBus.report(error, 'TestSource', false);
            errorBus.report(error, 'TestSource', false);
            
            // Should only be called once
            expect(handler).toHaveBeenCalledTimes(1);
        });
        
        it('should allow same error after time window', async () => {
            const handler = vi.fn();
            errorBus.subscribe(handler);
            
            const error = new Error('Duplicate error');
            
            errorBus.report(error, 'TestSource', false);
            expect(handler).toHaveBeenCalledTimes(1);
            
            // Wait for deduplication window to pass
            await new Promise(resolve => setTimeout(resolve, 150));
            
            errorBus.report(error, 'TestSource', false);
            expect(handler).toHaveBeenCalledTimes(2);
        });
        
        it('should not deduplicate different errors', () => {
            const handler = vi.fn();
            errorBus.subscribe(handler);
            
            errorBus.report(new Error('Error 1'), 'TestSource', false);
            errorBus.report(new Error('Error 2'), 'TestSource', false);
            errorBus.report(new Error('Error 3'), 'TestSource', false);
            
            expect(handler).toHaveBeenCalledTimes(3);
        });
        
        it('should respect deduplication config', () => {
            // Create ErrorBus with deduplication disabled
            const noDedupConfig: ErrorBusConfig = {
                ...config,
                deduplication: { enabled: false, windowMs: 100 }
            };
            const noDedupErrorBus = new ErrorBus(eventBus, noDedupConfig);
            
            const handler = vi.fn();
            noDedupErrorBus.subscribe(handler);
            
            const error = new Error('Not deduped');
            noDedupErrorBus.report(error, 'TestSource', false);
            noDedupErrorBus.report(error, 'TestSource', false);
            
            // Both should go through
            expect(handler).toHaveBeenCalledTimes(2);
        });
    });
    
    describe('Subscribe method', () => {
        it('should return unsubscribe function', () => {
            const handler = vi.fn();
            const unsubscribe = errorBus.subscribe(handler);
            
            errorBus.report(new Error('Test'), 'TestSource', false);
            expect(handler).toHaveBeenCalledTimes(1);
            
            unsubscribe();
            
            errorBus.report(new Error('Test 2'), 'TestSource', false);
            expect(handler).toHaveBeenCalledTimes(1); // Still 1
        });
    });
    
    describe('Console logging', () => {
        it('should log to console when configured', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            const loggingConfig: ErrorBusConfig = {
                ...config,
                logToConsole: true
            };
            const loggingErrorBus = new ErrorBus(eventBus, loggingConfig);
            
            loggingErrorBus.reportRecoverable(new Error('Warning'), 'TestSource');
            expect(consoleWarnSpy).toHaveBeenCalled();
            
            loggingErrorBus.reportFatal(new Error('Error'), 'TestSource');
            expect(consoleErrorSpy).toHaveBeenCalled();
            
            consoleWarnSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });
    });
    
    describe('Error preservation', () => {
        it('should preserve original error stack trace', () => {
            const handler = vi.fn();
            errorBus.subscribe(handler);
            
            const originalError = new Error('Original error');
            const originalStack = originalError.stack;
            
            errorBus.report(originalError, 'TestSource', false);
            
            const reportedContext = handler.mock.calls[0][0] as ErrorContext;
            expect(reportedContext.error).toBe(originalError);
            expect(reportedContext.error.stack).toBe(originalStack);
        });
        
        it('should preserve error properties', () => {
            const handler = vi.fn();
            errorBus.subscribe(handler);
            
            class CustomError extends Error {
                code = 'CUSTOM_ERROR';
                details = { foo: 'bar' };
            }
            
            const customError = new CustomError('Custom error');
            errorBus.report(customError, 'TestSource', false);
            
            const reportedContext = handler.mock.calls[0][0] as ErrorContext;
            const reportedError = reportedContext.error as CustomError;
            expect(reportedError.code).toBe('CUSTOM_ERROR');
            expect(reportedError.details).toEqual({ foo: 'bar' });
        });
    });
    
    describe('Config updates', () => {
        it('should update configuration at runtime', () => {
            const handler = vi.fn();
            errorBus.subscribe(handler);
            
            // Initially deduplication is enabled
            const error = new Error('Test');
            errorBus.report(error, 'TestSource', false);
            errorBus.report(error, 'TestSource', false);
            expect(handler).toHaveBeenCalledTimes(1);
            
            // Disable deduplication
            errorBus.updateConfig({
                deduplication: { enabled: false, windowMs: 100 }
            });
            
            // Now duplicates should go through
            errorBus.report(error, 'TestSource', false);
            errorBus.report(error, 'TestSource', false);
            expect(handler).toHaveBeenCalledTimes(3);
        });
    });
    
    describe('Facade pattern', () => {
        it('should be a thin wrapper over EventBus', () => {
            // ErrorBus should not have its own event system
            // It should use EventBus for all event operations
            
            const eventBusHandler = vi.fn();
            const errorBusHandler = vi.fn();
            
            // Subscribe via both EventBus and ErrorBus
            eventBus.subscribe('error', eventBusHandler);
            errorBus.subscribe(errorBusHandler);
            
            // Report an error
            errorBus.report(new Error('Test'), 'TestSource', false);
            
            // Both handlers should be called with same data
            expect(eventBusHandler).toHaveBeenCalledTimes(1);
            expect(errorBusHandler).toHaveBeenCalledTimes(1);
            expect(eventBusHandler.mock.calls[0][0]).toEqual(errorBusHandler.mock.calls[0][0]);
        });
    });
});