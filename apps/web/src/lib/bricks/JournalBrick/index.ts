/**
 * JournalBrick - LEGO Brick Exports
 * Machine Trim Response Storage for atomicaether-journal R2 bucket
 */

export { JournalBrick } from './core/JournalBrick';
export { JournalR2Service } from './services/JournalR2Service';
export type * from './types/JournalTypes';

// Register configuration types
import './types/ConfigAugmentation';