/**
 * ScrollbackBrick Models
 * Data structures for message history display
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  persona?: string;
  model?: string;
  streaming?: boolean;
  error?: boolean;
  edited?: boolean;
  tokenCount?: number;
}

export interface ScrollbackState {
  messages: Message[];
  conversationId: string;
  scrollPosition: number;
  isAtBottom: boolean;
  oldestMessageId?: string;
  newestMessageId?: string;
}

export interface ScrollbackConfig {
  maxMessages: number;
  autoScroll: boolean;
  showTimestamps: boolean;
  showMetadata: boolean;
  groupByTime: boolean;
  timeGroupingMinutes: number;
}