/**
 * LLMBrick
 * LEGO brick for managing LLM API connections
 * Supports Anthropic, OpenAI, and Fireworks AI
 */

import type { 
  EventBus, 
  ConfigBus, 
  StateBus, 
  ErrorBus 
} from '../../../buses/types';

import type { 
  LLMConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMModel
} from '../models/LLMModels';

import { AnthropicService } from '../services/AnthropicService';
import { OpenAIService } from '../services/OpenAIService';
import { FireworksService } from '../services/FireworksService';

export class LLMBrick {
  private config: LLMConfig | null = null;
  private anthropicService: AnthropicService | null = null;
  private openaiService: OpenAIService | null = null;
  private fireworksService: FireworksService | null = null;
  
  private currentModel: string;
  private isStreaming = false;
  
  constructor(
    private eventBus: EventBus,
    private configBus: ConfigBus,
    private stateBus: StateBus,
    private errorBus: ErrorBus
  ) {
    this.currentModel = '';
    this.init();
  }

  private async init() {
    try {
      // Load configuration
      await this.loadConfig();
      
      // Initialize services
      this.initializeServices();
      
      // Subscribe to events
      this.subscribeToEvents();
      
      // Load saved model preference
      await this.loadModelPreference();
      
      // Announce ready
      this.eventBus.publish('llm:ready', { 
        models: this.getAvailableModels(),
        currentModel: this.currentModel 
      });
      
    } catch (error) {
      console.error('LLMBrick initialization error:', error);
      if (this.errorBus && typeof this.errorBus.report === 'function') {
        try {
          this.errorBus.report(error as Error, 'LLMBrick', true);
        } catch (e) {
          console.warn('LLMBrick: Could not report to ErrorBus', e);
        }
      }
    }
  }

  private async loadConfig() {
    try {
      // Load models configuration
      this.config = await this.configBus.load<LLMConfig>('models');
      if (!this.config) {
        throw new Error('Failed to load models configuration');
      }
    } catch (error) {
      console.error('Failed to load LLM config:', error);
      throw error;
    }
  }

  private initializeServices() {
    // Get API keys from environment
    const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    const fireworksKey = import.meta.env.VITE_FIREWORKS_API_KEY || '';

    if (anthropicKey) {
      this.anthropicService = new AnthropicService(anthropicKey);
    }
    
    if (openaiKey) {
      this.openaiService = new OpenAIService(openaiKey);
    }
    
    if (fireworksKey) {
      this.fireworksService = new FireworksService(fireworksKey);
    }
  }

  private subscribeToEvents() {
    // Listen for message send events
    this.eventBus.subscribe('input:send', async (detail: any) => {
      await this.handleUserMessage(detail.content);
    });
    
    // Listen for model change events
    this.eventBus.subscribe('model:change', (detail: any) => {
      this.changeModel(detail.model);
    });
    
    // Listen for streaming toggle
    this.eventBus.subscribe('streaming:toggle', (detail: any) => {
      this.isStreaming = detail.enabled;
    });
  }

  private async loadModelPreference() {
    try {
      const savedModel = await this.stateBus.get<string>('selectedModel');
      if (savedModel && this.isModelAvailable(savedModel)) {
        this.currentModel = savedModel;
      } else if (this.config) {
        this.currentModel = this.config.defaultModel;
      }
    } catch (error) {
      console.warn('Could not load model preference:', error);
      if (this.config) {
        this.currentModel = this.config.defaultModel;
      }
    }
  }

  private async handleUserMessage(content: string) {
    if (!this.currentModel || !content.trim()) return;
    
    // Publish user message event
    this.eventBus.publish('message:sent', {
      content,
      persona: 'User'
    });
    
    try {
      // Create request
      const request: LLMRequest = {
        model: this.currentModel,
        messages: [
          { role: 'user', content }
        ],
        stream: this.isStreaming
      };
      
      // Get the right service
      const service = this.getServiceForModel(this.currentModel);
      if (!service) {
        throw new Error(`No service available for model: ${this.currentModel}`);
      }
      
      if (this.isStreaming) {
        // Handle streaming response
        await this.handleStreamingResponse(service, request);
      } else {
        // Handle regular response
        const response = await service.complete(request);
        this.eventBus.publish('message:received', {
          content: response.content,
          model: this.currentModel
        });
      }
      
    } catch (error) {
      console.error('LLM request failed:', error);
      this.eventBus.publish('llm:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.currentModel
      });
    }
  }

  private async handleStreamingResponse(service: any, request: LLMRequest) {
    const messageId = `msg-${Date.now()}`;
    
    // Start streaming
    this.eventBus.publish('message:stream:start', {
      messageId,
      model: this.currentModel
    });
    
    try {
      let fullContent = '';
      
      for await (const chunk of service.stream(request)) {
        if (chunk.finished) {
          // End streaming
          this.eventBus.publish('message:stream:end', {
            messageId,
            finalContent: fullContent
          });
        } else {
          fullContent += chunk.delta;
          // Send chunk
          this.eventBus.publish('message:stream:chunk', {
            messageId,
            chunk: chunk.delta
          });
        }
      }
    } catch (error) {
      console.error('Streaming failed:', error);
      this.eventBus.publish('message:stream:error', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private getServiceForModel(modelId: string): any {
    if (!this.config) return null;
    
    // Find which provider has this model
    for (const [providerId, provider] of Object.entries(this.config.providers)) {
      if (provider.models.some(m => m.id === modelId)) {
        switch (providerId) {
          case 'anthropic':
            return this.anthropicService;
          case 'openai':
            return this.openaiService;
          case 'fireworks':
            return this.fireworksService;
        }
      }
    }
    
    return null;
  }

  private isModelAvailable(modelId: string): boolean {
    if (!this.config) return false;
    
    for (const provider of Object.values(this.config.providers)) {
      if (provider.models.some(m => m.id === modelId)) {
        return true;
      }
    }
    
    return false;
  }

  public getAvailableModels(): LLMModel[] {
    if (!this.config) return [];
    
    const models: LLMModel[] = [];
    for (const provider of Object.values(this.config.providers)) {
      models.push(...provider.models);
    }
    
    return models;
  }

  public changeModel(modelId: string) {
    if (!this.isModelAvailable(modelId)) {
      console.warn(`Model ${modelId} is not available`);
      return;
    }
    
    this.currentModel = modelId;
    this.stateBus.set('selectedModel', modelId);
    
    this.eventBus.publish('model:changed', {
      model: modelId
    });
  }

  public getCurrentModel(): string {
    return this.currentModel;
  }

  public destroy() {
    // Cleanup if needed
  }
}