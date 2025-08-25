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
  private isStreaming = true; // Enable streaming by default
  
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

    console.log('🔑 Initializing LLM services...');
    console.log('  Anthropic key:', anthropicKey ? '✅ Found' : '❌ Missing');
    console.log('  OpenAI key:', openaiKey ? '✅ Found' : '❌ Missing');
    console.log('  Fireworks key:', fireworksKey ? '✅ Found' : '❌ Missing');

    if (anthropicKey) {
      this.anthropicService = new AnthropicService(anthropicKey);
      console.log('  ✅ AnthropicService initialized');
    }
    
    if (openaiKey) {
      this.openaiService = new OpenAIService(openaiKey);
      console.log('  ✅ OpenAIService initialized');
    }
    
    if (fireworksKey) {
      this.fireworksService = new FireworksService(fireworksKey);
      console.log('  ✅ FireworksService initialized');
    }
  }

  private subscribeToEvents() {
    // CRITICAL: Listen for turn:input:ready instead of input:submit
    // This ensures MessageTurnBrick has created the turn before we process
    this.eventBus.subscribe('turn:input:ready', async (data: any) => {
      await this.handleInputFromVoid(data);
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

  private async handleInputFromVoid(data: any) {
    // Extract data from the input:submit event
    const { text, fileUrls, model, persona, timestamp } = data;
    
    // Validate input
    if (!text?.trim() && (!fileUrls || fileUrls.length === 0)) {
      return; // Nothing to process
    }
    
    // Use the model specified in the event, not our internal currentModel
    const targetModel = model || this.currentModel;
    if (!targetModel) {
      console.error('No model specified');
      return;
    }
    
    // Generate unique message ID for tracking
    const messageId = `llm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Broadcast that we're starting to process
    this.eventBus.publish('llm:response:start', {
      messageId,
      model: targetModel,
      persona,
      timestamp: Date.now()
    });
    
    try {
      // Process the message
      await this.processMessage({
        messageId,
        text,
        fileUrls,
        model: targetModel,
        persona
      });
    } catch (error) {
      // Broadcast error to the void
      this.eventBus.publish('llm:response:error', {
        messageId,
        error: error.message || 'Failed to process message',
        model: targetModel,
        timestamp: Date.now()
      });
    }
  }

  private async processMessage(params: {
    messageId: string;
    text: string;
    fileUrls?: string[];
    model: string;
    persona: string;
  }) {
    const { messageId, text, fileUrls, model, persona } = params;
    
    // Create request
    const request: LLMRequest = {
      model,
      messages: [
        { role: 'user', content: text }
      ],
      stream: this.isStreaming,
      fileUrls: fileUrls || []
    };
    
    // Add persona as system message if needed
    if (persona && persona !== 'user') {
      request.messages.unshift({
        role: 'system',
        content: `You are acting as a ${persona}. Respond accordingly.`
      });
    }
    
    // Route to appropriate service based on model
    const service = this.getServiceForModel(model);
    if (!service) {
      throw new Error(`No service available for model: ${model}`);
    }
    
    // Handle streaming vs regular response
    if (this.isStreaming) {
      await this.handleStreamingResponse(service, request, messageId, model);
    } else {
      await this.handleRegularResponse(service, request, messageId, model);
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

  private async handleStreamingResponse(service: any, request: LLMRequest, messageId: string, model: string) {
    try {
      let fullContent = '';
      
      for await (const chunk of service.stream(request)) {
        if (chunk.finished) {
          // Broadcast completion to the void
          this.eventBus.publish('llm:response:complete', {
            messageId,
            fullResponse: fullContent,
            model,
            timestamp: Date.now()
          });
        } else {
          fullContent += chunk.delta;
          // Broadcast chunk to the void
          this.eventBus.publish('llm:response:chunk', {
            messageId,
            chunk: chunk.delta,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Streaming failed:', error);
      // Broadcast error to the void
      this.eventBus.publish('llm:response:error', {
        messageId,
        error: error instanceof Error ? error.message : 'Stream failed',
        model,
        timestamp: Date.now()
      });
    }
  }
  
  private async handleRegularResponse(service: any, request: LLMRequest, messageId: string, model: string) {
    try {
      const response = await service.complete(request);
      
      // Broadcast complete response to the void
      this.eventBus.publish('llm:response:complete', {
        messageId,
        fullResponse: response.content,
        machineTrim: response.machineTrim, // Pass through machine trim data
        model,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Regular response failed:', error);
      // Broadcast error to the void
      this.eventBus.publish('llm:response:error', {
        messageId,
        error: error instanceof Error ? error.message : 'Request failed',
        model,
        timestamp: Date.now()
      });
    }
  }

  private getServiceForModel(modelId: string): any {
    console.log(`🔍 Looking for service for model: ${modelId}`);
    
    if (!this.config) {
      console.log('  ❌ No config loaded');
      return null;
    }
    
    console.log('  Available services:', {
      anthropic: this.anthropicService ? '✅' : '❌',
      openai: this.openaiService ? '✅' : '❌',
      fireworks: this.fireworksService ? '✅' : '❌'
    });
    
    // Find which provider has this model
    for (const [providerId, provider] of Object.entries(this.config.providers)) {
      console.log(`  Checking provider: ${providerId}`);
      if (provider.models.some(m => m.id === modelId)) {
        console.log(`  ✅ Found model in ${providerId}`);
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
    
    console.log('  ❌ Model not found in any provider');
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