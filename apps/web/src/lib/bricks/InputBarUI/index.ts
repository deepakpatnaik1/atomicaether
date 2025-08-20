export { default as InputBarUI } from './core/InputBarUI.svelte';
export { InputBarService } from './core/InputBarService.js';
export type * from './core/types.js';

// Import config types to ensure module augmentation is processed
import './configTypes.js';