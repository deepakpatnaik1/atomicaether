/**
 * StateBus unit tests
 * 
 * Testing reactive state coordination and type safety
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateBus } from './core/StateBus.svelte';
import type { StateMap } from './models/StateMap';

// Extend StateMap for testing
declare module './models/StateMap' {
    interface StateMap {
        'test:string': string;
        'test:number': number;
        'test:boolean': boolean;
        'test:object': { name: string; value: number };
    }
}

describe('StateBus', () => {
    let stateBus: StateBus;
    
    beforeEach(() => {
        stateBus = new StateBus();
    });
    
    describe('Basic operations', () => {
        it('should get and set values', () => {
            stateBus.set('test:string', 'hello');
            expect(stateBus.get('test:string')).toBe('hello');
            
            stateBus.set('test:number', 42);
            expect(stateBus.get('test:number')).toBe(42);
            
            stateBus.set('test:boolean', true);
            expect(stateBus.get('test:boolean')).toBe(true);
        });
        
        it('should return undefined for uninitialized state', () => {
            expect(stateBus.get('test:string')).toBeUndefined();
        });
        
        it('should update existing values', () => {
            stateBus.set('test:string', 'initial');
            expect(stateBus.get('test:string')).toBe('initial');
            
            stateBus.set('test:string', 'updated');
            expect(stateBus.get('test:string')).toBe('updated');
        });
        
        it('should handle complex objects', () => {
            const obj = { name: 'test', value: 123 };
            stateBus.set('test:object', obj);
            expect(stateBus.get('test:object')).toEqual(obj);
            
            // Update object
            stateBus.set('test:object', { name: 'updated', value: 456 });
            expect(stateBus.get('test:object')).toEqual({ name: 'updated', value: 456 });
        });
    });
    
    describe('Lazy initialization', () => {
        it('should not have state until accessed', () => {
            expect(stateBus.has('test:string')).toBe(false);
            
            // Access creates it
            stateBus.get('test:string');
            expect(stateBus.has('test:string')).toBe(true);
        });
        
        it('should create state on first set', () => {
            expect(stateBus.has('test:number')).toBe(false);
            
            stateBus.set('test:number', 42);
            expect(stateBus.has('test:number')).toBe(true);
            expect(stateBus.get('test:number')).toBe(42);
        });
    });
    
    describe('State management', () => {
        it('should delete state', () => {
            stateBus.set('test:string', 'value');
            expect(stateBus.has('test:string')).toBe(true);
            
            stateBus.delete('test:string');
            expect(stateBus.has('test:string')).toBe(false);
            expect(stateBus.get('test:string')).toBeUndefined();
        });
        
        it('should clear all states', () => {
            stateBus.set('test:string', 'value1');
            stateBus.set('test:number', 42);
            stateBus.set('test:boolean', true);
            
            expect(stateBus.keys().length).toBe(3);
            
            stateBus.clear();
            expect(stateBus.keys().length).toBe(0);
            expect(stateBus.get('test:string')).toBeUndefined();
        });
        
        it('should list all initialized keys', () => {
            expect(stateBus.keys()).toEqual([]);
            
            stateBus.set('test:string', 'value');
            stateBus.get('test:number'); // Just access, don't set
            
            const keys = stateBus.keys();
            expect(keys).toContain('test:string');
            expect(keys).toContain('test:number');
            expect(keys.length).toBe(2);
        });
    });
    
    describe('Helper methods', () => {
        it('should get or create with default value', () => {
            // First call creates with default
            const value1 = stateBus.getOrCreate('test:string', 'default');
            expect(value1).toBe('default');
            expect(stateBus.get('test:string')).toBe('default');
            
            // Second call returns existing
            const value2 = stateBus.getOrCreate('test:string', 'other');
            expect(value2).toBe('default'); // Not 'other'!
        });
        
        it('should update using a function', () => {
            stateBus.set('test:number', 10);
            
            stateBus.update('test:number', (current) => {
                expect(current).toBe(10);
                return current! * 2;
            });
            
            expect(stateBus.get('test:number')).toBe(20);
        });
        
        it('should handle update on undefined state', () => {
            stateBus.update('test:number', (current) => {
                expect(current).toBeUndefined();
                return 42;
            });
            
            expect(stateBus.get('test:number')).toBe(42);
        });
    });
    
    describe('Type safety', () => {
        it('should maintain type safety for different state types', () => {
            // This is more of a compile-time test
            // TypeScript should enforce these types
            
            stateBus.set('test:string', 'text');
            const str: string | undefined = stateBus.get('test:string');
            expect(typeof str).toBe('string');
            
            stateBus.set('test:number', 123);
            const num: number | undefined = stateBus.get('test:number');
            expect(typeof num).toBe('number');
            
            stateBus.set('test:boolean', false);
            const bool: boolean | undefined = stateBus.get('test:boolean');
            expect(typeof bool).toBe('boolean');
        });
    });
    
    describe('State isolation', () => {
        it('should isolate different state keys', () => {
            stateBus.set('test:string', 'value1');
            stateBus.set('test:number', 42);
            
            expect(stateBus.get('test:string')).toBe('value1');
            expect(stateBus.get('test:number')).toBe(42);
            
            stateBus.set('test:string', 'value2');
            expect(stateBus.get('test:string')).toBe('value2');
            expect(stateBus.get('test:number')).toBe(42); // Unchanged
        });
    });
    
    describe('Reactivity foundation', () => {
        it('should store reactive values', () => {
            // Note: We can't fully test Svelte reactivity in unit tests
            // This just ensures the structure is correct
            
            stateBus.set('test:number', 1);
            const value1 = stateBus.get('test:number');
            
            stateBus.set('test:number', 2);
            const value2 = stateBus.get('test:number');
            
            // In a real Svelte component, value1 would reactively update
            // Here we just verify the bus returns the new value
            expect(value2).toBe(2);
        });
    });
});