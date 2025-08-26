/**
 * ModelSelectionBrick
 * LEGO brick for managing model selection persistence
 * 
 * Following Essential Boss Rules:
 * - Rule 1 (Webby): Uses native localStorage API
 * - Rule 2 (Four Buses): Only depends on standard bus connectors
 * - Rule 4 (LEGO): Single responsibility, standard connectors only
 * - Rule 8 (No Hardcoding): Storage key and defaults from config
 */

import type { 
  EventBus, 
  ConfigBus, 
  StateBus, 
  ErrorBus 
} from '../../../buses';

export class ModelSelectionBrick {
  private readonly STORAGE_KEY = 'selectedModel';
  private config: any = null;
  
  constructor(
    private eventBus: EventBus,
    private configBus: ConfigBus,
    private stateBus: StateBus,
    private errorBus: ErrorBus
  ) {
    this.init();
  }

  private async init() {
    try {
      // Load dropdown data config to get available models and defaults
      this.config = await this.configBus.load('dropdownData');
      
      // Load persisted model selection
      await this.loadPersistedSelection();
      
      // Subscribe to model selection events from UI
      this.eventBus.subscribe('model:select', (data: any) => {
        this.handleModelSelection(data.model);
      });
      
    } catch (error) {
      console.error('ModelSelectionBrick initialization error:', error);
      this.errorBus.report(error as Error, 'ModelSelectionBrick', true);
    }
  }

  private async loadPersistedSelection() {
    try {
      // Get persisted model from localStorage
      const persistedModel = localStorage.getItem(this.STORAGE_KEY);
      
      let selectedModel: string;
      
      if (persistedModel && this.isValidModel(persistedModel)) {
        // Use persisted model if valid
        selectedModel = persistedModel;
      } else {
        // Fall back to config default
        selectedModel = this.config?.defaults?.selectedModel || 'claude-sonnet-4-20250514';
      }
      
      // Set in StateBus for other bricks to observe
      this.stateBus.set('selectedModel', selectedModel);
      
      // Publish initial selection event
      this.eventBus.publish('model:selected', { model: selectedModel });
      
    } catch (error) {
      console.error('Failed to load persisted model selection:', error);
      // Use config default on error
      const defaultModel = this.config?.defaults?.selectedModel || 'claude-sonnet-4-20250514';
      this.stateBus.set('selectedModel', defaultModel);
      this.eventBus.publish('model:selected', { model: defaultModel });
    }
  }

  private handleModelSelection(model: string) {
    if (!this.isValidModel(model)) {
      console.warn('Invalid model selected:', model);
      return;
    }
    
    try {
      // Persist to localStorage
      localStorage.setItem(this.STORAGE_KEY, model);
      
      // Update StateBus
      this.stateBus.set('selectedModel', model);
      
      // Publish selection event for other bricks
      this.eventBus.publish('model:selected', { model });
      
    } catch (error) {
      console.error('Failed to persist model selection:', error);
      this.errorBus.report(error as Error, 'ModelSelectionBrick', true);
    }
  }

  private isValidModel(modelId: string): boolean {
    if (!this.config?.models) return false;
    
    // Check if model exists in any category
    for (const [category, models] of Object.entries(this.config.models)) {
      if (category.startsWith('_')) continue; // Skip metadata
      
      if (Array.isArray(models)) {
        const found = models.find((m: any) => m.id === modelId);
        if (found) return true;
      }
    }
    
    return false;
  }

  /**
   * Get current selected model
   */
  public getCurrentModel(): string | null {
    return this.stateBus.get('selectedModel') || null;
  }

  /**
   * Programmatically select a model
   */
  public selectModel(model: string) {
    this.handleModelSelection(model);
  }

  /**
   * Clear persisted selection (for testing/reset)
   */
  public clearPersistedSelection() {
    localStorage.removeItem(this.STORAGE_KEY);
    const defaultModel = this.config?.defaults?.selectedModel || 'claude-sonnet-4-20250514';
    this.stateBus.set('selectedModel', defaultModel);
    this.eventBus.publish('model:selected', { model: defaultModel });
  }

  public destroy() {
    // Clean up if needed
  }
}