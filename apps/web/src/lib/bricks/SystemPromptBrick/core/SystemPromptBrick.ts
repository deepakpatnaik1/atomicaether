/**
 * SystemPromptBrick - Template Loading and Variable Substitution
 * Essential Boss Rules Compliant LEGO Brick
 */

import { configBus, eventBus, errorBus } from '$lib/buses';
import type { 
  SystemPromptTemplate, 
  PromptVariables, 
  RenderedPrompt, 
  SystemPromptConfig,
  TemplateLoadEvent,
  PromptRenderEvent
} from '../types/SystemPromptTypes';

export class SystemPromptBrick {
  private templates: Map<string, SystemPromptTemplate> = new Map();
  private config: SystemPromptConfig;
  private isInitialized = false;

  constructor(
    private eventBusInstance = eventBus,
    private configBusInstance = configBus,
    private errorBusInstance = errorBus
  ) {
    this.config = {
      templatesPath: '/aetherVault/prompts',
      defaultVariables: {},
      enableHotReload: true
    };
  }

  /**
   * Initialize the SystemPromptBrick
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 SystemPromptBrick initializing...');
      
      // Load configuration with robust defaults fallback
      this.config = await this.configBusInstance.load('SystemPromptBrick', {
        default: this.config
      });
      
      console.log('⚙️ Configuration loaded:', {
        templatesPath: this.config.templatesPath,
        enableHotReload: this.config.enableHotReload,
        defaultVariableCount: Object.keys(this.config.defaultVariables).length
      });
      
      // Load templates
      await this.loadTemplates();
      
      // Set up hot reload if enabled
      if (this.config.enableHotReload) {
        this.setupHotReload();
      }
      
      this.isInitialized = true;
      console.log('✅ SystemPromptBrick initialized successfully');
      console.log(`📋 Templates available: ${this.getAvailableTemplates().join(', ')}`);
      
    } catch (error) {
      console.error('❌ SystemPromptBrick initialization failed:', error);
      this.errorBusInstance.reportFatal(error as Error, 'SystemPromptBrick.initialize');
      throw error;
    }
  }

  /**
   * Get a rendered prompt by template name
   */
  async getPrompt(templateName: string, variables: PromptVariables = {}): Promise<RenderedPrompt> {
    if (!this.isInitialized) {
      throw new Error('SystemPromptBrick not initialized');
    }

    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      // Merge with default variables
      const mergedVariables = { ...this.config.defaultVariables, ...variables };
      
      // Render template
      const content = this.renderTemplate(template.content, mergedVariables);
      
      const result: RenderedPrompt = {
        content,
        templateName,
        variables: mergedVariables,
        timestamp: Date.now()
      };

      // Publish success event
      this.eventBusInstance.publish('systemprompt:render', {
        templateName,
        variables: mergedVariables,
        success: true,
        content
      } as PromptRenderEvent);

      return result;
      
    } catch (error) {
      // Publish error event
      this.eventBusInstance.publish('systemprompt:render', {
        templateName,
        variables,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as PromptRenderEvent);
      
      this.errorBusInstance.report(error as Error, 'SystemPromptBrick.getPrompt', 'warning');
      throw error;
    }
  }

  /**
   * List available templates
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get template metadata
   */
  getTemplateInfo(templateName: string): SystemPromptTemplate | undefined {
    return this.templates.get(templateName);
  }

  /**
   * Load all templates from the configured path
   */
  private async loadTemplates(): Promise<void> {
    try {
      // For now, we'll create the machine trim template directly
      // In the future, this would load from filesystem/aetherVault
      await this.loadMachineTrimTemplate();
      
    } catch (error) {
      this.errorBusInstance.report(error as Error, 'SystemPromptBrick.loadTemplates', 'error');
      throw error;
    }
  }

  /**
   * Load the machine trim system prompt template
   */
  private async loadMachineTrimTemplate(): Promise<void> {
    try {
      console.log('📋 Loading machine-trim template with linguistic rules...');
      
      const template: SystemPromptTemplate = {
        name: 'machine-trim',
        provider: 'universal',
        variables: ['persona', 'model', 'context'],
        content: `You must always respond using structured JSON with both normal and compressed versions.

MACHINE TRIM RULES:
- Use "not_stored" inferability for greetings, acknowledgments, basic confirmations with zero information value
- Use "inferable_acknowledgment" for responses that confirm understanding but add minimal analysis  
- Use "stored" for responses containing new information, facts, or analysis
- For stored responses: remove conversational markers, preserve core facts, eliminate redundancy
- Maintain 100% factual accuracy while using telegraphic style for essential information only

COMPRESSION PRINCIPLES:
1. Remove: emoji, filler words ("total of", "though they can"), conversational courtesy
2. Preserve: numbers, dates, key concepts, factual relationships
3. Style: telegraphic, essential information only

Examples:
- "Hello! How can I assist you today?" → inferability: "not_stored"
- "India has had 14 Presidents since 1950. Each serves five-year terms." → "India 14 Presidents since 1950, five-year terms" + inferability: "stored"

Current context: {{context}}
Persona: {{persona}}
Model: {{model}}

Respond using this exact JSON structure:
{
  "normal_response": "Full conversational response for user",
  "machine_trim": {
    "user_message": "User's original message",
    "ai_response": "Compressed response following trim rules OR inferability marker",
    "inferability": "stored" | "inferable_acknowledgment" | "not_stored"
  }
}`
      };

      this.templates.set('machine-trim', template);
      console.log(`✅ Template 'machine-trim' loaded (${template.content.length} chars, ${template.variables.length} variables)`);
      
      // Publish template loaded event
      this.eventBusInstance.publish('systemprompt:loaded', {
        templateName: 'machine-trim',
        success: true
      } as TemplateLoadEvent);
      
    } catch (error) {
      console.error('❌ Failed to load machine-trim template:', error);
      
      // Publish template load failure event
      this.eventBusInstance.publish('systemprompt:loaded', {
        templateName: 'machine-trim',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as TemplateLoadEvent);
      
      throw error;
    }
  }

  /**
   * Render template with variable substitution
   */
  private renderTemplate(templateContent: string, variables: PromptVariables): string {
    let rendered = templateContent;
    
    // Simple variable substitution: {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    // Check for unresolved variables
    const unresolvedMatches = rendered.match(/\{\{[^}]+\}\}/g);
    if (unresolvedMatches) {
      console.warn('Unresolved template variables:', unresolvedMatches);
      // Replace with empty string
      unresolvedMatches.forEach(match => {
        rendered = rendered.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
      });
    }
    
    return rendered.trim();
  }

  /**
   * Set up hot reload for template changes
   */
  private setupHotReload(): void {
    // Hot reload is handled by ConfigBus internally via HMR
    // For now, just log that hot reload is enabled
    console.log('🔥 SystemPromptBrick hot reload enabled');
  }
}