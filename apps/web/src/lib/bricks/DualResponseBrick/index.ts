/**
 * DualResponseBrick - LEGO Brick Exports
 * Dual response generation with normal and machine-trimmed outputs
 */

export { DualResponseBrick } from './core/DualResponseBrick';
export { DualResponseService } from './services/DualResponseService';
export { DualResponseParser } from './services/DualResponseParser';
export type * from './types/DualResponseTypes';

// Register configuration types
import './types/ConfigAugmentation';