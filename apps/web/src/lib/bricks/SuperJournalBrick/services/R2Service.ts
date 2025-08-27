/**
 * SuperJournal R2Service - Thin Wrapper over Working Server API
 * Rule 3 Compliant: Minimal abstraction over proven CORS-compliant solution
 * Rule 6 Compliant: Reuses working server-side API pattern
 */

export interface MessagePairEntry {
  id: string;
  timestamp: number;
  userMessage: string;
  assistantMessage: string;
  model?: string;
  turnNumber?: number;
}

export class R2Service {
  constructor() {
    // Rule 6: Rely on server-side API for R2 configuration and CORS handling
  }

  /**
   * Save message pair entry to R2
   * Rule 3 & 6: Thin wrapper over proven working server API (CORS-compliant)
   */
  async saveMessagePair(entry: MessagePairEntry): Promise<string> {
    // Rule 6: Reuse working server-side solution instead of direct R2 calls
    const response = await fetch('/api/superjournal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userMessage: entry.userMessage,
        assistantMessage: entry.assistantMessage,
        turnId: entry.id,
        timestamp: entry.timestamp
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Server API failed');
    }

    return result.key;
  }

  /**
   * Generate date-organized key for R2 storage
   * Pattern: entries/YYYY/MM/DD/entry-id.json
   */
  private generateDateKey(entryId: string, timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `entries/${year}/${month}/${day}/${entryId}.json`;
  }
}