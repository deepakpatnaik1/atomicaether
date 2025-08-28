/**
 * DualResponseService - LLM Orchestration Service
 * Rule 6: Don't reinvent - uses existing LLMBrick for actual LLM calls
 * Rule 3: Thin wrapper over LLMBrick with dual-response prompt injection
 * 
 * FIELD REPORT LEARNINGS APPLIED:
 * - Event-driven LLM integration patterns documented for future implementation (Learning #2)
 * - Flexible LLM service interface to support different integration approaches
 * - Comprehensive retry logic with exponential backoff for reliability
 * - Fallback behavior configuration for production resilience
 */

import type { 
  DualResponseRequest,
  DualResponseResult,
  DualResponseConfig,
  DualResponseMetadata,
  DualResponse
} from '../types/DualResponseTypes';

import type { LLMRequest } from '$lib/bricks/LLMBrick';
import { DualResponseParser } from './DualResponseParser';

export class DualResponseService {
  private config: DualResponseConfig;
  private parser: DualResponseParser;

  constructor(config: DualResponseConfig) {
    this.config = config;
    this.parser = new DualResponseParser(config);
  }

  /**
   * Generate dual response using existing LLM infrastructure
   * Rule 6: Don't reinvent - leverages existing LLMBrick capabilities
   */
  async generate(request: DualResponseRequest, llmService: any): Promise<DualResponseResult> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= this.config.maxRetries) {
      try {
        if (this.config.debugMode) {
          console.log('🔄 DualResponseService: Generating dual response', {
            attempt: retryCount + 1,
            model: request.model,
            persona: request.persona
          });
        }

        // Inject dual-response prompt into system message
        const enhancedSystemPrompt = this.createDualResponsePrompt(
          request.system_prompt
        );

        // Create LLM request with enhanced system prompt
        const llmRequest: LLMRequest = {
          model: request.model,
          messages: [
            { role: 'system', content: enhancedSystemPrompt },
            { role: 'user', content: request.user_message }
          ],
          stream: false // We need complete response for parsing
        };

        // Call LLM service - Rule 6: Don't reinvent
        const llmResponse = await this.callLLMService(llmService, llmRequest);
        
        // Parse the dual response
        const parsedOutput = this.parser.parse(llmResponse.content, request.user_message);
        
        // Handle parsing success/failure
        if (parsedOutput.parsing_success && parsedOutput.machine_trim_raw) {
          // Successfully parsed dual response
          const dualResponse = this.createDualResponse(
            request,
            parsedOutput,
            startTime
          );

          if (this.config.debugMode) {
            console.log('✅ DualResponseService: Dual response generated successfully', {
              compressionRatio: Math.round(parsedOutput.compression_ratio * 100) / 100,
              generationTime: Date.now() - startTime
            });
          }

          return {
            success: true,
            response: dualResponse,
            retry_count: retryCount,
            timestamp: Date.now()
          };

        } else {
          // Parsing failed - handle based on fallback behavior
          return await this.handleParsingFailure(
            request, 
            llmResponse, 
            retryCount, 
            startTime
          );
        }

      } catch (error) {
        console.error('❌ DualResponseService: Generation failed', {
          attempt: retryCount + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        retryCount++;
        
        if (retryCount > this.config.maxRetries) {
          return this.createErrorResult(error, retryCount, startTime);
        }

        // Wait before retry (exponential backoff)
        await this.sleep(Math.pow(2, retryCount) * 1000);
      }
    }

    // Should not reach here, but TypeScript needs this
    return this.createErrorResult(new Error('Max retries exceeded'), retryCount, startTime);
  }

  /**
   * Create enhanced system prompt with dual-response instructions
   * Rule 8: No hardcoding - prompt template from configuration
   */
  private createDualResponsePrompt(originalSystemPrompt: string): string {
    const dualResponseInstructions = this.config.dualResponsePrompt
      .replace('{delimiter}', this.config.machineTrimsDelimiter);

    return `${originalSystemPrompt}

${dualResponseInstructions}`;
  }

  /**
   * Call LLM service using existing infrastructure
   * Rule 3: Thin wrapper - minimal abstraction over existing service
   */
  private async callLLMService(llmService: any, request: LLMRequest): Promise<{ content: string }> {
    // For non-streaming requests, we need to use the service's complete method
    if (llmService.complete) {
      return await llmService.complete(request);
    }

    // Fallback: If only streaming is available, collect full response
    if (llmService.stream) {
      let fullContent = '';
      
      for await (const chunk of llmService.stream(request)) {
        if (!chunk.finished) {
          fullContent += chunk.delta;
        }
      }
      
      return { content: fullContent };
    }

    throw new Error('LLM service does not support required methods');
  }

  /**
   * Handle parsing failure based on configuration
   * Rule 9: Debug with discipline - preserve error handling
   */
  private async handleParsingFailure(
    request: DualResponseRequest,
    llmResponse: { content: string },
    retryCount: number,
    startTime: number
  ): Promise<DualResponseResult> {
    
    if (this.config.debugMode) {
      console.warn('⚠️ DualResponseService: Parsing failed', {
        attempt: retryCount + 1,
        fallbackBehavior: this.config.fallbackBehavior
      });
    }

    switch (this.config.fallbackBehavior) {
      case 'retry':
        // Will retry in main loop
        throw new Error('Dual response parsing failed - retrying');
        
      case 'normal_only':
        // Return normal response only with fallback flag
        return {
          success: true,
          response: this.createFallbackResponse(request, llmResponse.content, startTime),
          fallback_used: true,
          retry_count: retryCount,
          timestamp: Date.now()
        };
        
      case 'error':
      default:
        return {
          success: false,
          error: 'Failed to parse dual response from LLM output',
          retry_count: retryCount,
          timestamp: Date.now()
        };
    }
  }

  /**
   * Create complete DualResponse object from parsed output
   */
  private createDualResponse(
    request: DualResponseRequest,
    parsedOutput: any,
    startTime: number
  ): DualResponse {
    const generationTime = Date.now() - startTime;
    
    const metadata: DualResponseMetadata = {
      model: request.model,
      persona: request.persona,
      timestamp: request.timestamp || Date.now(),
      compression_ratio: parsedOutput.compression_ratio,
      parsing_success: true,
      generation_time_ms: generationTime,
      original_length: parsedOutput.normal_response.length,
      compressed_length: parsedOutput.machine_trim_raw?.length || 0
    };

    const machine_trim = this.parser.createMachineTrimResponse(
      request.user_message,
      parsedOutput.machine_trim_raw
    );

    return {
      normal_response: parsedOutput.normal_response,
      machine_trim,
      generation_metadata: metadata
    };
  }

  /**
   * Create fallback response when parsing fails but fallback is enabled
   */
  private createFallbackResponse(
    request: DualResponseRequest,
    normalResponse: string,
    startTime: number
  ): DualResponse {
    const generationTime = Date.now() - startTime;
    
    const metadata: DualResponseMetadata = {
      model: request.model,
      persona: request.persona,
      timestamp: request.timestamp || Date.now(),
      compression_ratio: 1.0, // No compression in fallback
      parsing_success: false,
      generation_time_ms: generationTime,
      original_length: normalResponse.length,
      compressed_length: normalResponse.length
    };

    // Create machine trim that mirrors normal response (no compression)
    const machine_trim = this.parser.createMachineTrimResponse(
      request.user_message,
      normalResponse
    );

    return {
      normal_response: normalResponse,
      machine_trim,
      generation_metadata: metadata
    };
  }

  /**
   * Create error result for failed operations
   */
  private createErrorResult(
    error: unknown, 
    retryCount: number, 
    startTime: number
  ): DualResponseResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      retry_count: retryCount,
      timestamp: Date.now()
    };
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration - enables runtime reconfiguration
   * Rule 8: No hardcoding - all behavior configurable
   */
  updateConfig(newConfig: DualResponseConfig): void {
    this.config = newConfig;
    this.parser.updateConfig(newConfig);
    
    if (this.config.debugMode) {
      console.log('🔧 DualResponseService: Configuration updated');
    }
  }
}