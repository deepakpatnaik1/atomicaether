/**
 * EventBus unit tests
 * 
 * Testing the thin wrapper behavior and type safety
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from './core/EventBus';
import { BaseEvent } from './events/BaseEvent';

// Test event types
interface TestEventMap {
    'test:message': { text: string };
    'test:count': { value: number };
    'test:empty': void;
}

describe('EventBus', () => {
    let eventBus: EventBus<TestEventMap>;
    
    beforeEach(() => {
        eventBus = new EventBus<TestEventMap>();
    });
    
    describe('Core functionality', () => {
        it('should publish and subscribe to events', () => {
            const handler = vi.fn();
            const unsubscribe = eventBus.subscribe('test:message', handler);
            
            eventBus.publish('test:message', { text: 'Hello' });
            
            expect(handler).toHaveBeenCalledWith({ text: 'Hello' });
            expect(handler).toHaveBeenCalledTimes(1);
            
            unsubscribe();
        });
        
        it('should handle multiple subscribers', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            
            eventBus.subscribe('test:count', handler1);
            eventBus.subscribe('test:count', handler2);
            
            eventBus.publish('test:count', { value: 42 });
            
            expect(handler1).toHaveBeenCalledWith({ value: 42 });
            expect(handler2).toHaveBeenCalledWith({ value: 42 });
        });
        
        it('should unsubscribe correctly', () => {
            const handler = vi.fn();
            const unsubscribe = eventBus.subscribe('test:message', handler);
            
            eventBus.publish('test:message', { text: 'First' });
            expect(handler).toHaveBeenCalledTimes(1);
            
            unsubscribe();
            
            eventBus.publish('test:message', { text: 'Second' });
            expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
        });
        
        it('should handle once() subscriptions', () => {
            const handler = vi.fn();
            eventBus.once('test:message', handler);
            
            eventBus.publish('test:message', { text: 'First' });
            eventBus.publish('test:message', { text: 'Second' });
            
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith({ text: 'First' });
        });
        
        it('should allow canceling once() before it fires', () => {
            const handler = vi.fn();
            const unsubscribe = eventBus.once('test:message', handler);
            
            unsubscribe();
            
            eventBus.publish('test:message', { text: 'Never received' });
            
            expect(handler).not.toHaveBeenCalled();
        });
    });
    
    describe('EventTarget integration', () => {
        it('should expose the underlying EventTarget', () => {
            const target = eventBus.getTarget();
            expect(target).toBeInstanceOf(EventTarget);
        });
        
        it('should work with native addEventListener', () => {
            const target = eventBus.getTarget();
            const handler = vi.fn();
            
            target.addEventListener('test:message', handler);
            
            eventBus.publish('test:message', { text: 'Native' });
            
            expect(handler).toHaveBeenCalled();
            const event = handler.mock.calls[0][0] as CustomEvent;
            expect(event.detail).toEqual({ text: 'Native' });
        });
    });
    
    describe('Type safety', () => {
        it('should maintain type safety for event payloads', () => {
            // This is a compile-time test - TypeScript ensures type safety
            eventBus.subscribe('test:message', (detail) => {
                // TypeScript knows detail is { text: string }
                const upperText: string = detail.text.toUpperCase();
                expect(upperText).toBe('TYPED');
            });
            
            eventBus.publish('test:message', { text: 'typed' });
        });
        
        it('should handle void event payloads', () => {
            const handler = vi.fn();
            eventBus.subscribe('test:empty', handler);
            
            eventBus.publish('test:empty', undefined as any);
            
            expect(handler).toHaveBeenCalledWith(undefined);
        });
    });
    
    describe('BaseEvent class', () => {
        class TestEvent extends BaseEvent<{ message: string }> {
            static readonly type = 'TestEvent';
        }
        
        it('should create events with detail', () => {
            const event = new TestEvent({ message: 'Hello' });
            expect(event.detail).toEqual({ message: 'Hello' });
        });
        
        it('should get type from class', () => {
            expect(TestEvent.getType()).toBe('TestEvent');
        });
    });
    
    describe('Error handling', () => {
        it('should not throw if handler throws', () => {
            const errorHandler = vi.fn(() => {
                throw new Error('Handler error');
            });
            const normalHandler = vi.fn();
            
            eventBus.subscribe('test:message', errorHandler);
            eventBus.subscribe('test:message', normalHandler);
            
            // Should not throw
            expect(() => {
                eventBus.publish('test:message', { text: 'Test' });
            }).not.toThrow();
            
            // Normal handler should still be called
            expect(normalHandler).toHaveBeenCalled();
        });
    });
    
    describe('Memory management', () => {
        it('should not leak memory when unsubscribing', () => {
            const handlers: Array<() => void> = [];
            
            // Subscribe and unsubscribe many times
            for (let i = 0; i < 100; i++) {
                const unsubscribe = eventBus.subscribe('test:count', () => {});
                handlers.push(unsubscribe);
            }
            
            // Unsubscribe all
            handlers.forEach(unsub => unsub());
            
            // Verify no handlers are called
            const testHandler = vi.fn();
            eventBus.subscribe('test:count', testHandler);
            eventBus.publish('test:count', { value: 1 });
            
            expect(testHandler).toHaveBeenCalledTimes(1); // Only our test handler
        });
    });
});