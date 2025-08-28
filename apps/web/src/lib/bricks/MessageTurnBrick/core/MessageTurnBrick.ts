import type { 
  MessageTurn, 
  MessageTurnState, 
  BossMessage, 
  SamaraMessage,
  MessageTurnConfig
} from '../types/MessageTurn.types';
import type { EventBus, StateBus, ConfigBus, ErrorBus } from '$lib/buses/types';

export class MessageTurnBrick {
  private eventBus: EventBus;
  private stateBus: StateBus;
  private configBus: ConfigBus;
  private errorBus: ErrorBus;
  
  private turns: MessageTurn[] = [];
  private currentTurn: MessageTurn | null = null;
  private turnCounter: number = 0;
  private config: MessageTurnConfig = {};
  
  constructor(
    eventBus: EventBus,
    stateBus: StateBus,
    configBus: ConfigBus,
    errorBus: ErrorBus
  ) {
    this.eventBus = eventBus;
    this.stateBus = stateBus;
    this.configBus = configBus;
    this.errorBus = errorBus;
    
    this.initialize();
  }
  
  private async initialize() {
    // Load configuration (CRITICAL: must be async per field report learnings)
    await this.loadConfiguration();
    
    // Subscribe to events
    this.subscribeToEvents();
    
    // Initialize state
    this.publishState();
  }
  
  private async loadConfiguration() {
    try {
      // FIELD REPORT LEARNING: ConfigBus.load() is async, must await
      const loadedConfig = await this.configBus.load<MessageTurnConfig>('MessageTurnBrick');
      this.config = loadedConfig || {};
    } catch (error) {
      // Graceful fallback to default empty config
      this.config = {};
    }
  }
  
  private subscribeToEvents() {
    // Listen for Boss input (from InputBarUI)
    this.eventBus.subscribe('input:submit', (data: any) => {
      this.handleBossInput(data);
    });
    
    // Listen for Samara responses (from LLMBrick)
    this.eventBus.subscribe('llm:response:start', (data: any) => {
      this.handleSamaraStart(data);
    });
    
    this.eventBus.subscribe('llm:response:chunk', (data: any) => {
      this.handleSamaraChunk(data);
    });
    
    this.eventBus.subscribe('llm:response:complete', (data: any) => {
      this.handleSamaraComplete(data);
    });
    
    this.eventBus.subscribe('llm:response:error', (data: any) => {
      this.handleSamaraError(data);
    });
    
    // Listen for dual response completion when enabled
    if (this.config.enableDualResponse) {
      this.eventBus.subscribe('dual-response:generated', (data: any) => {
        this.handleDualResponseGenerated(data);
      });
    }
  }
  
  private handleBossInput(data: any) {
    // Create Boss message
    const bossMessage: BossMessage = {
      id: `boss-${Date.now()}`,
      content: data.text || '',
      persona: data.persona || 'Boss',
      model: data.model || 'unknown',
      timestamp: data.timestamp || Date.now(),
      fileUrls: data.fileUrls,
      fileMetadata: data.files
    };
    
    // Create new turn
    this.turnCounter++;
    const turn: MessageTurn = {
      id: `turn-${Date.now()}`,
      turnNumber: this.turnCounter,
      bossMessage,
      status: 'pending',
      startedAt: Date.now()
    };
    
    // Store turn
    this.currentTurn = turn;
    this.turns.push(turn);
    
    // Publish turn created event
    this.eventBus.publish('turn:created', { turn });
    
    // CONDITIONAL ROUTING: Route based on external configuration
    if (this.config.enableDualResponse) {
      // Route to DualResponseBrick for dual-response workflow
      this.eventBus.publish('dual-response:request', {
        ...data,
        turnId: turn.id
      });
    } else {
      // CRITICAL: Publish turn:input:ready to prevent race condition (original behavior)
      // This ensures MessageTurnBrick creates the turn BEFORE LLMBrick processes
      this.eventBus.publish('turn:input:ready', {
        ...data,
        turnId: turn.id
      });
    }
    
    // Update state
    this.publishState();
  }
  
  private handleSamaraStart(data: any) {
    if (!this.currentTurn) {
      this.errorBus.reportError(
        new Error('Samara start without current turn'),
        'MessageTurnBrick'
      );
      return;
    }
    
    // Initialize Samara message
    this.currentTurn.samaraMessage = {
      id: `samara-${Date.now()}`,
      content: '',
      model: data.model || 'unknown',
      timestamp: Date.now()
    };
    
    // Update turn status
    this.currentTurn.status = 'processing';
    
    // Publish event
    this.eventBus.publish('turn:processing', { 
      turnId: this.currentTurn.id 
    });
    
    // Update state
    this.publishState();
  }
  
  private handleSamaraChunk(data: any) {
    if (!this.currentTurn || !this.currentTurn.samaraMessage) {
      return;
    }
    
    // Append chunk to content
    // Handle both 'chunk' and 'content' field names (lesson from debugging)
    const chunk = data.chunk || data.content || '';
    this.currentTurn.samaraMessage.content += chunk;
    
    // Update state
    this.publishState();
  }
  
  private handleSamaraComplete(data: any) {
    if (!this.currentTurn || !this.currentTurn.samaraMessage) {
      this.errorBus.reportError(
        new Error('Samara complete without current turn'),
        'MessageTurnBrick'
      );
      return;
    }
    
    // Update Samara message with final content
    // Handle both 'fullResponse' and 'content' field names (lesson from debugging)
    this.currentTurn.samaraMessage.content = 
      data.fullResponse || 
      data.content || 
      this.currentTurn.samaraMessage.content;
    
    // Calculate processing time
    this.currentTurn.samaraMessage.processingTime = 
      Date.now() - this.currentTurn.startedAt;
    
    // Mark turn as completed
    this.currentTurn.status = 'completed';
    this.currentTurn.completedAt = Date.now();
    
    // Publish turn completed event
    this.eventBus.publish('turn:completed', { 
      turn: this.currentTurn 
    });
    
    // Clear current turn
    this.currentTurn = null;
    
    // Update state
    this.publishState();
  }
  
  private handleSamaraError(data: any) {
    if (!this.currentTurn) {
      return;
    }
    
    // Mark turn as error
    this.currentTurn.status = 'error';
    this.currentTurn.error = data.error || 'Unknown error';
    this.currentTurn.completedAt = Date.now();
    
    // Publish turn error event
    this.eventBus.publish('turn:error', { 
      turnId: this.currentTurn.id,
      error: this.currentTurn.error
    });
    
    // Clear current turn
    this.currentTurn = null;
    
    // Update state
    this.publishState();
  }
  
  private handleDualResponseGenerated(data: any) {
    if (!this.currentTurn) {
      this.errorBus.reportError(
        new Error('Dual response generated without current turn'),
        'MessageTurnBrick'
      );
      return;
    }
    
    // Extract normal response from dual response for display
    const normalResponse = data.response?.normal_response || '';
    
    // Create Samara message from normal response
    this.currentTurn.samaraMessage = {
      id: `samara-${Date.now()}`,
      content: normalResponse,
      model: data.metadata?.model || 'unknown',
      timestamp: Date.now(),
      processingTime: Date.now() - this.currentTurn.startedAt
    };
    
    // Mark turn as completed
    this.currentTurn.status = 'completed';
    this.currentTurn.completedAt = Date.now();
    
    // Publish turn completed event
    this.eventBus.publish('turn:completed', { 
      turn: this.currentTurn 
    });
    
    // Clear current turn
    this.currentTurn = null;
    
    // Update state
    this.publishState();
  }

  private publishState() {
    const state: MessageTurnState = {
      turns: this.turns,
      currentTurnId: this.currentTurn?.id || null,
      totalTurns: this.turns.length
    };
    
    this.stateBus.set('messageTurn', state);
  }
  
  public getTurns(): MessageTurn[] {
    return this.turns;
  }
  
  public getCurrentTurn(): MessageTurn | null {
    return this.currentTurn;
  }
  
  public clearHistory() {
    this.turns = [];
    this.currentTurn = null;
    this.turnCounter = 0;
    this.publishState();
  }
}