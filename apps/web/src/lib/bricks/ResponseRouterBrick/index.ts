/**
 * ResponseRouterBrick - LEGO Brick Exports
 * Automatic routing of dual responses to appropriate storage destinations
 */

export { ResponseRouterBrick } from './core/ResponseRouterBrick';
export { RoutingOrchestrator } from './services/RoutingOrchestrator';
export { AtomicOperationManager } from './services/AtomicOperationManager';
export type * from './types/RoutingTypes';

// Register configuration types
import './types/ConfigAugmentation';