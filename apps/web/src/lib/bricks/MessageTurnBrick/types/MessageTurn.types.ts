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