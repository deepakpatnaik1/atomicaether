/**
 * ScrollbackBrick Events
 * Events published by the ScrollbackBrick
 */

import type { Message } from '../models/ScrollbackModels';

// Events the ScrollbackBrick publishes
export class ScrollbackReadyEvent extends Event {
  constructor(public readonly conversationId: string) {
    super('scrollback:ready');
  }
}

export class ScrollbackScrolledEvent extends Event {
  constructor(
    public readonly scrollPosition: number,
    public readonly isAtBottom: boolean
  ) {
    super('scrollback:scrolled');
  }
}

export class MessageClickedEvent extends Event {
  constructor(public readonly message: Message) {
    super('scrollback:message:clicked');
  }
}

export class MessageCopiedEvent extends Event {
  constructor(public readonly message: Message) {
    super('scrollback:message:copied');
  }
}

export class ScrollbackClearedEvent extends Event {
  constructor(public readonly conversationId: string) {
    super('scrollback:cleared');
  }
}

// Events the ScrollbackBrick listens for (defined elsewhere but typed here for reference)
export interface MessageSentEvent extends Event {
  detail: {
    content: string;
    persona?: string;
  };
}

export interface MessageReceivedEvent extends Event {
  detail: {
    content: string;
    model?: string;
  };
}

export interface MessageStreamStartEvent extends Event {
  detail: {
    messageId: string;
    model?: string;
  };
}

export interface MessageStreamChunkEvent extends Event {
  detail: {
    messageId: string;
    chunk: string;
  };
}

export interface MessageStreamEndEvent extends Event {
  detail: {
    messageId: string;
    finalContent: string;
  };
}

export interface ConversationLoadedEvent extends Event {
  detail: {
    conversationId: string;
    messages: Message[];
  };
}