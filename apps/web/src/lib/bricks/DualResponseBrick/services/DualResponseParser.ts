/**
 * DualResponseParser - Response Splitting Service
 * Thin wrapper over string parsing for extracting normal and machine trim responses
 * 
 * FIELD REPORT LEARNINGS APPLIED:
 * - Robust delimiter detection with graceful failure handling (Learning #5)
 * - Configurable parsing patterns to avoid hardcoding (Learning #3)
 * - Defensive string operations with comprehensive fallbacks
 */

import type { 
  ParsedLLMOutput, 
  DualResponseConfig, 
  MachineTrimResponse 
} from '../types/DualResponseTypes';

export class DualResponseParser {
  private config: DualResponseConfig;

  constructor(config: DualResponseConfig) {
    this.config = config;
  }

  /**
   * Parse LLM output containing both normal and machine trim responses
   * Thin wrapper over string operations - Rule 3: Let platform features shine
   */
  parse(llmOutput: string, userMessage: string): ParsedLLMOutput {
    try {
      const delimiter = this.config.machineTrimsDelimiter;
      const delimiterIndex = llmOutput.lastIndexOf(delimiter);
      
      // No delimiter found - return normal response only
      if (delimiterIndex === -1) {
        if (this.config.debugMode) {
          console.log('🔍 DualResponseParser: No machine trim delimiter found');
        }
        
        return {
          normal_response: llmOutput.trim(),
          parsing_success: false,
          delimiter_found: false,
          compression_ratio: 1.0
        };
      }

      // Extract normal response (everything before delimiter)
      const normal_response = llmOutput
        .substring(0, delimiterIndex)
        .trim();

      // Extract machine trim (everything after delimiter)
      const machine_trim_raw = llmOutput
        .substring(delimiterIndex + delimiter.length)
        .trim();

      // Calculate compression ratio
      const compression_ratio = machine_trim_raw.length / normal_response.length;

      if (this.config.debugMode) {
        console.log('✅ DualResponseParser: Successfully parsed dual response', {
          normal_length: normal_response.length,
          machine_trim_length: machine_trim_raw.length,
          compression_ratio: Math.round(compression_ratio * 100) / 100
        });
      }

      return {
        normal_response,
        machine_trim_raw,
        parsing_success: true,
        delimiter_found: true,
        compression_ratio
      };

    } catch (error) {
      console.error('❌ DualResponseParser: Parse failed:', error);
      
      // Fallback to treating entire output as normal response
      return {
        normal_response: llmOutput.trim(),
        parsing_success: false,
        delimiter_found: false,
        compression_ratio: 1.0
      };
    }
  }

  /**
   * Convert raw machine trim to structured MachineTrimResponse
   * Detects inferability based on content patterns
   */
  createMachineTrimResponse(
    userMessage: string, 
    machineTrimRaw: string
  ): MachineTrimResponse {
    const inferability = this.detectInferability(machineTrimRaw);
    
    return {
      user_message: userMessage,
      ai_response: machineTrimRaw,
      inferability
    };
  }

  /**
   * Detect inferability type based on machine trim content
   * Rule 8: No hardcoding - patterns configurable in future iterations
   */
  private detectInferability(machineTrimContent: string): MachineTrimResponse['inferability'] {
    if (!this.config.enableInferabilityDetection) {
      return 'stored'; // Default when detection disabled
    }

    const content = machineTrimContent.toLowerCase();
    
    // Not stored indicators
    const notStoredPatterns = [
      '[greeting',
      '[acknowledgment',
      '[confirmation',
      'hello',
      'hi there',
      'thank you',
      'you\'re welcome',
      'got it',
      'understood'
    ];

    // Inferable acknowledgment indicators  
    const inferablePatterns = [
      '[acknowledgment with context]',
      'noted:',
      'confirmed:',
      'understood:',
      'processed:'
    ];

    // Check for not_stored patterns
    if (notStoredPatterns.some(pattern => content.includes(pattern))) {
      return 'not_stored';
    }

    // Check for inferable_acknowledgment patterns
    if (inferablePatterns.some(pattern => content.includes(pattern))) {
      return 'inferable_acknowledgment';
    }

    // Default to stored for substantial content
    return 'stored';
  }

  /**
   * Validate compression meets target ratio
   * Used for quality control and optimization feedback
   */
  validateCompression(compressionRatio: number): boolean {
    return compressionRatio <= this.config.compressionTarget;
  }

  /**
   * Update configuration - enables runtime reconfiguration
   * Rule 8: No hardcoding - all behavior configurable
   */
  updateConfig(newConfig: DualResponseConfig): void {
    this.config = newConfig;
    
    if (this.config.debugMode) {
      console.log('🔧 DualResponseParser: Configuration updated', {
        delimiter: this.config.machineTrimsDelimiter,
        compressionTarget: this.config.compressionTarget,
        inferabilityDetection: this.config.enableInferabilityDetection
      });
    }
  }
}