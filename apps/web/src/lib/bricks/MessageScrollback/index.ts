/**
 * MessageScrollback Brick
 * 
 * Pure UI component that displays conversation turns
 * from MessageTurnBrick state via StateBus
 * 
 * Essential Boss Rules:
 * - Rule 6 (SOC): Pure presentation, no logic
 * - Rule 7 (No Magic): All styling from config
 * - Rule 10 (Void): Reads from the void (StateBus)
 */

export { default as MessageScrollback } from './core/MessageScrollback.svelte';
export type * from './core/types';