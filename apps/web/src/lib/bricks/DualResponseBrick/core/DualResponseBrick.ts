/**
 * DualResponseBrick - LEGO Brick for Dual Response Generation
 * 
 * Single Responsibility: Generate both normal and machine-trimmed responses from single LLM call
 * 
 * FIELD REPORT LEARNINGS APPLIED:
 * - Simplified bus integration to avoid TypeScript complexity (Learning #1)
 * - Robust fallback configuration handling (Learning #3)  
 * - Defensive result handling with proper fallbacks (Learning #5)
 * - External configuration with runtime defaults (Architecture Decision)
 * 
 * TODO: Add full EventBus/StateBus integration in next iteration for production monitoring
 */

import type { 
  DualResponseConfig,
  DualResponseRequest,
  DualResponseResult,
  DualResponse
} from '../types/DualResponseTypes';

import { DualResponseService } from '../services/DualResponseService';

export class DualResponseBrick {
  private config: DualResponseConfig | null = null;
  private service: DualResponseService | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize DualResponseBrick with configuration and service setup
   * Simplified version for demo
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🔧 DualResponseBrick: Initializing...');
      
      // Use default configuration for demo
      this.config = this.getDefaultConfiguration();
      
      // Initialize service
      this.service = new DualResponseService(this.config);
      
      this.initialized = true;
      console.log('✅ DualResponseBrick: Initialization complete');
      
    } catch (error) {
      console.error('❌ DualResponseBrick: Initialization failed:', error);
    }
  }


  /**
   * Robust defaults ensure functionality even without config file
   * Rule 5: Easy removal - graceful degradation
   * 
   * FIELD REPORT LEARNING: Always provide comprehensive fallback defaults
   * to prevent initialization failures due to missing configuration files
   */
  private getDefaultConfiguration(): DualResponseConfig {
    return {
      dualResponsePrompt: `After providing your complete response, add a new line and write "MACHINE_TRIM:" followed by a compressed version that preserves all semantic meaning while removing conversational elements, pleasantries, and redundant phrasing.`,
      machineTrimsDelimiter: 'MACHINE_TRIM:',
      fallbackBehavior: 'normal_only', // Graceful degradation - continue with normal responses if parsing fails
      timeoutMs: 30000,
      maxRetries: 2, // Balance between reliability and performance
      compressionTarget: 0.6, // 60% compression target based on machine trim effectiveness
      enableInferabilityDetection: true, // Automatic classification of response types
      debugMode: false // Production-safe default
    };
  }

  /**
   * Generate dual response (normal + machine trim) from single LLM call
   * Main public API method
   */
  async generate(request: DualResponseRequest, llmService?: any): Promise<DualResponseResult> {
    if (!this.initialized || !this.service) {
      const error = 'DualResponseBrick not initialized';
      console.error('❌ DualResponseBrick:', error);
      
      return {
        success: false,
        error,
        timestamp: Date.now()
      };
    }

    try {
      console.log('🔄 DualResponseBrick: Generating dual response...');

      // Generate dual response using service
      const result = await this.service.generate(request, llmService);

      if (result.success) {
        console.log('✅ DualResponseBrick: Dual response generated successfully');
      } else {
        console.warn('⚠️ DualResponseBrick: Generation failed:', result.error);
      }

      return result;

    } catch (error) {
      console.error('❌ DualResponseBrick: Generation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check if dual response generation is available
   * Useful for conditional logic in consuming components
   */
  get ready(): boolean {
    return this.initialized && this.service !== null;
  }

  /**
   * Get current configuration
   * Useful for debugging and monitoring
   */
  get configuration(): DualResponseConfig | null {
    return this.config;
  }

  /**
   * Get performance metrics
   * Useful for monitoring and optimization
   */
  getMetrics(): {
    initialized: boolean;
    ready: boolean;
    configuration: DualResponseConfig | null;
  } {
    return {
      initialized: this.initialized,
      ready: this.ready,
      configuration: this.config
    };
  }
}