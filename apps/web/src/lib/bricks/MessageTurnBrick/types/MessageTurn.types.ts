export interface BossMessage {
  id: string;
  content: string;
  persona: string;
  model: string;
  timestamp: number;
  fileUrls?: string[];
  fileMetadata?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

export interface SamaraMessage {
  id: string;
  content: string;
  model: string;
  timestamp: number;
  processingTime?: number;
}

export interface MessageTurn {
  id: string;
  turnNumber: number;
  bossMessage: BossMessage;
  samaraMessage?: SamaraMessage;
  status: 'pending' | 'processing' | 'completed' | 'error';
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface MessageTurnState {
  turns: MessageTurn[];
  currentTurnId: string | null;
  totalTurns: number;
}

// Machine Trim Types
export interface MachineTrimMetadata {
  hasDecisions: boolean;
  isInferable: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface MachineTrimmedMessage {
  id: string;
  originalId: string; // References the original message ID
  trimmedContent: string;
  metadata: MachineTrimMetadata;
  timestamp: number;
}

export interface MessagePairSet {
  id: string; // Unique identifier for the pair set
  turnId: string; // Reference to MessageTurn.id
  
  // Original messages (full conversational content)
  original: {
    bossMessage: BossMessage;
    samaraMessage: SamaraMessage;
  };
  
  // Machine-trimmed messages (compressed for storage)
  trimmed: {
    bossMessage: MachineTrimmedMessage;
    samaraMessage: MachineTrimmedMessage;
  };
  
  // Lifecycle timestamps
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number; // Soft delete timestamp
  
  // Status tracking
  status: 'active' | 'deleted' | 'archived';
}