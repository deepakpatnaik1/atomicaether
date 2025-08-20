/**
 * Base class for typed events
 * 
 * Each event class is its own type identifier - no magic strings
 * Following Rule 1 (Webby): Type inference over explicit types
 */

export abstract class BaseEvent<T = void> {
    /**
     * Event type identifier - should match the class name
     * This is used as the event name in EventTarget
     */
    static readonly type: string;
    
    /**
     * Event payload
     */
    constructor(public readonly detail: T) {}
    
    /**
     * Get the event type from the class
     */
    static getType(): string {
        return this.type || this.name;
    }
}

/**
 * Helper type to extract the detail type from an event class
 */
export type EventDetail<T extends BaseEvent<any>> = T extends BaseEvent<infer D> ? D : never;

/**
 * Helper type to create an event map from event classes
 */
export type EventMap<T extends Record<string, typeof BaseEvent>> = {
    [K in keyof T]: InstanceType<T[K]> extends BaseEvent<infer D> ? D : never;
};