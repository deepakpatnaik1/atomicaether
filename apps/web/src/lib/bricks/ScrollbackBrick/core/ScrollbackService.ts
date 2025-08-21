/**
 * ScrollbackService
 * Business logic for message history management
 */

import type { Message, ScrollbackConfig } from '../models/ScrollbackModels';

export class ScrollbackService {
  constructor(private config: ScrollbackConfig) {}

  /**
   * Format message content (markdown, bullets, etc)
   */
  formatContent(content: string, textColor: string, boldWeight: string, bulletColor: string): string {
    const lines = content.split('\n');
    const processedLines = [];
    
    for (let line of lines) {
      // Process markdown
      line = line.replace(/\*\*(.*?)\*\*/g, 
        `<strong style="color: ${textColor}; font-weight: ${boldWeight};">$1</strong>`);
      line = line.replace(/\*(.*?)\*/g, 
        `<em style="color: ${textColor};">$1</em>`);
      
      // Process bullet points
      if (line.startsWith('• ')) {
        const bulletContent = line.substring(2);
        processedLines.push(
          `<div class="bullet-item" style="padding-left: 8px;">` +
          `<span class="bullet" style="color: ${bulletColor}; margin-right: 8px; font-weight: bold;">•</span>` +
          `<span class="bullet-content">${bulletContent}</span></div>`
        );
      } else if (line.trim() === '') {
        processedLines.push('</p><p class="message-paragraph">');
      } else {
        processedLines.push(line);
      }
    }
    
    let formatted = processedLines.join('\n');
    formatted = `<p class="message-paragraph" style="margin: 0 0 12px 0;">` + formatted + '</p>';
    
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p class="message-paragraph"><\/p>/g, '');
    formatted = formatted.replace(/<p class="message-paragraph">\n<\/p>/g, '');
    
    return formatted;
  }

  /**
   * Group messages by time periods
   */
  groupMessagesByTime(messages: Message[]): Map<string, Message[]> {
    const groups = new Map<string, Message[]>();
    
    if (!this.config.groupByTime) {
      groups.set('all', messages);
      return groups;
    }
    
    const groupingMs = this.config.timeGroupingMinutes * 60 * 1000;
    
    messages.forEach(message => {
      const groupTime = Math.floor(message.timestamp / groupingMs) * groupingMs;
      const groupKey = new Date(groupTime).toISOString();
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(message);
    });
    
    return groups;
  }

  /**
   * Manage message list size
   */
  trimMessages(messages: Message[]): Message[] {
    if (messages.length <= this.config.maxMessages) {
      return messages;
    }
    
    // Keep the most recent messages
    return messages.slice(-this.config.maxMessages);
  }

  /**
   * Generate message ID
   */
  generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if should auto-scroll
   */
  shouldAutoScroll(isAtBottom: boolean, newMessage: Message): boolean {
    if (!this.config.autoScroll) return false;
    
    // Auto-scroll if already at bottom
    if (isAtBottom) return true;
    
    // Auto-scroll for user's own messages
    if (newMessage.role === 'user') return true;
    
    return false;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Today: show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // This year: show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Other years: show full date
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  }
}