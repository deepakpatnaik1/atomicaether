/**
 * MachineTrimService - Generates compressed versions of conversations
 * Uses the machine trim rules from aetherVault/config/machineTrim.json
 */

export interface MachineTrimRequest {
  bossMessage: string;
  assistantMessage: string;
  model: string;
  persona: string;
}

export interface MachineTrimResult {
  trimmedBoss: string;
  trimmedAssistant: string;
  metadata: {
    hasDecisions: boolean;
    isInferable: boolean;
    priority: 'high' | 'medium' | 'low';
  };
}

export class MachineTrimService {
  private trimRules: any = null;
  
  constructor() {
    this.loadTrimRules();
  }
  
  private async loadTrimRules() {
    try {
      const response = await fetch('/aetherVault/config/machineTrim.json');
      if (response.ok) {
        this.trimRules = await response.json();
        console.log('📏 MachineTrim: Rules loaded successfully');
      } else {
        console.error('📏 MachineTrim: Failed to load trim rules');
        this.setFallbackRules();
      }
    } catch (error) {
      console.error('📏 MachineTrim: Error loading trim rules:', error);
      this.setFallbackRules();
    }
  }
  
  private setFallbackRules() {
    // Simple fallback rules if the config file can't be loaded
    this.trimRules = {
      enabled: true,
      compressionRules: {
        preserveSemanticMeaning: true,
        removeRedundancy: true,
        format: "Boss: [message]\\n{persona}: [compressed response]"
      },
      alwaysPreserve: [
        "Life decisions and personal choices",
        "Important conclusions and determinations",
        "Action items and commitments",
        "Insights and realizations"
      ]
    };
  }
  
  /**
   * Generate machine-trimmed version of a conversation
   */
  async trim(request: MachineTrimRequest): Promise<MachineTrimResult> {
    if (!this.trimRules?.enabled) {
      // If trimming is disabled, return the original content
      return {
        trimmedBoss: request.bossMessage,
        trimmedAssistant: request.assistantMessage,
        metadata: {
          hasDecisions: false,
          isInferable: false,
          priority: 'medium'
        }
      };
    }
    
    try {
      // For now, implement basic compression logic
      // In the future, this could use an LLM to generate the trimmed version
      
      const trimmedBoss = this.compressMessage(request.bossMessage, 'boss');
      const trimmedAssistant = this.compressMessage(request.assistantMessage, 'assistant');
      
      // Analyze content for metadata
      const hasDecisions = this.detectDecisions(request.assistantMessage);
      const isInferable = this.detectInferability(request.assistantMessage);
      const priority = this.determinePriority(request.bossMessage, request.assistantMessage);
      
      return {
        trimmedBoss,
        trimmedAssistant,
        metadata: {
          hasDecisions,
          isInferable,
          priority
        }
      };
      
    } catch (error) {
      console.error('📏 MachineTrim: Error during trimming:', error);
      // Return original content if trimming fails
      return {
        trimmedBoss: request.bossMessage,
        trimmedAssistant: request.assistantMessage,
        metadata: {
          hasDecisions: false,
          isInferable: false,
          priority: 'medium'
        }
      };
    }
  }
  
  private compressMessage(message: string, role: 'boss' | 'assistant'): string {
    // Basic compression: remove excessive whitespace and common filler words
    let compressed = message
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n+/g, ' ') // Multiple newlines to single space
      .trim();
    
    // For very short messages, don't compress
    if (compressed.length < 50) {
      return compressed;
    }
    
    // Remove common filler phrases for assistant responses
    if (role === 'assistant') {
      compressed = compressed
        .replace(/^(Sure!?|Of course!?|Certainly!?|Absolutely!?)\s+/i, '')
        .replace(/\b(I'd be happy to help|I'm happy to help|Happy to help)\b/gi, '')
        .replace(/\bLet me\b/gi, '');
    }
    
    // Truncate if still too long (emergency compression)
    if (compressed.length > 200) {
      compressed = compressed.substring(0, 197) + '...';
    }
    
    return compressed;
  }
  
  private detectDecisions(content: string): boolean {
    const decisionKeywords = [
      'decide', 'decision', 'choose', 'recommend', 'suggest', 'should',
      'advise', 'propose', 'conclude', 'determine', 'resolve'
    ];
    
    const lowerContent = content.toLowerCase();
    return decisionKeywords.some(keyword => lowerContent.includes(keyword));
  }
  
  private detectInferability(content: string): boolean {
    const inferablePatterns = [
      /^(you'?re welcome|thanks?|thank you|sure|ok|okay|yes|no)!?$/i,
      /^(happy to help|glad to help|no problem)!?$/i,
      /^(of course|certainly|absolutely)!?$/i
    ];
    
    const trimmedContent = content.trim();
    return inferablePatterns.some(pattern => pattern.test(trimmedContent));
  }
  
  private determinePriority(bossMessage: string, assistantMessage: string): 'high' | 'medium' | 'low' {
    const content = (bossMessage + ' ' + assistantMessage).toLowerCase();
    
    // High priority keywords
    const highPriorityKeywords = [
      'career', 'job', 'decision', 'important', 'urgent', 'critical',
      'life', 'relationship', 'health', 'finance', 'emergency'
    ];
    
    // Low priority keywords  
    const lowPriorityKeywords = [
      'thanks', 'welcome', 'hello', 'hi', 'bye', 'goodbye',
      'please', 'sorry', 'excuse me'
    ];
    
    if (highPriorityKeywords.some(keyword => content.includes(keyword))) {
      return 'high';
    }
    
    if (lowPriorityKeywords.some(keyword => content.includes(keyword))) {
      return 'low';
    }
    
    return 'medium';
  }
}