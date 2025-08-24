/**
 * SelectionPersistenceBrick - Handles persistence of user selections
 * 
 * Following Essential Boss Rules:
 * - Rule 2 (Four Buses): Uses EventBus for communication, StateBus for state
 * - Rule 4 (LEGO): Can be easily removed without breaking other bricks
 * - Rule 5 (Easy Removal): All persistence logic contained in this brick
 * 
 * This brick bridges EventBus selection events with StateBus persistence
 */

import { eventBus, stateBus } from '../../../buses';

export class SelectionPersistenceBrick {
    constructor() {
        this.initialize();
    }
    
    private initialize() {
        // Listen for selection changes and persist them
        eventBus.subscribe('selection:model:changed', (data: any) => {
            stateBus.set('selection:model', data.model);
        });
        
        eventBus.subscribe('selection:persona:changed', (data: any) => {
            stateBus.set('selection:persona', data.persona);
        });
        
        eventBus.subscribe('selection:theme:changed', (data: any) => {
            stateBus.set('selection:theme', data.theme);
        });
        
        // Respond to requests for current persisted values
        eventBus.subscribe('selection:model:request', () => {
            const model = stateBus.get('selection:model');
            if (model) {
                eventBus.publish('selection:model:current', { model });
            }
        });
        
        eventBus.subscribe('selection:persona:request', () => {
            const persona = stateBus.get('selection:persona');
            if (persona) {
                eventBus.publish('selection:persona:current', { persona });
            }
        });
        
        eventBus.subscribe('selection:theme:request', () => {
            const theme = stateBus.get('selection:theme');
            if (theme) {
                eventBus.publish('selection:theme:current', { theme });
            }
        });
    }
}