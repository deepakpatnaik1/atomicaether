/**
 * JournalBrick - Machine Trim Response Storage LEGO Brick
 * Essential Boss Rules Compliant
 * 
 * Single Responsibility: Store/retrieve machine-trimmed responses in atomicaether-journal R2 bucket
 * Standard Bus Connectors: ConfigBus, EventBus, StateBus, ErrorBus
 * Thin Wrapper: Minimal abstraction over JournalR2Service
 */

import { configBus, eventBus, stateBus, errorBus } from '$lib/buses';
import { JournalR2Service } from '../services/JournalR2Service';
import type { 
  JournalEntry, 
  JournalConfig, 
  MachineTrimResponse,
  JournalOperationResult,
  JournalStoreEvent,
  JournalDeleteEvent,
  JournalListResult
} from '../types/JournalTypes';

export class JournalBrick {
  private r2Service: JournalR2Service;
  private config: JournalConfig;
  private isInitialized = false;

  constructor(
    private eventBusInstance = eventBus,
    private configBusInstance = configBus,
    private stateBusInstance = stateBus,
    private errorBusInstance = errorBus
  ) {
    // Default configuration with fallback values
    this.config = {
      bucketName: 'atomicaether-journal',
      region: 'auto',
      endpoint: '',
      dateOrganized: true,
      retryAttempts: 3,
      timeoutMs: 10000
    };

    this.r2Service = new JournalR2Service(this.config);
  }

  /**
   * Initialize JournalBrick with configuration and credentials
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 JournalBrick initializing...');

      // Load configuration with robust defaults fallback
      this.config = await this.configBusInstance.load('JournalBrick', {
        default: this.config
      });

      console.log('⚙️ JournalBrick configuration loaded:', {
        bucketName: this.config.bucketName,
        dateOrganized: this.config.dateOrganized,
        retryAttempts: this.config.retryAttempts
      });

      // Get R2 credentials from environment
      const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
      const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
      const endpoint = import.meta.env.VITE_R2_ENDPOINT || this.config.endpoint;

      if (!accessKeyId || !secretAccessKey || !endpoint) {
        throw new Error('R2 credentials not configured for JournalBrick');
      }

      // Update config with environment endpoint
      this.config.endpoint = endpoint;
      this.r2Service = new JournalR2Service(this.config);

      // Initialize R2 service
      await this.r2Service.initialize(accessKeyId, secretAccessKey);

      // Update state bus
      this.stateBusInstance.set('journal:initialized', true);
      this.stateBusInstance.set('journal:bucket', this.config.bucketName);

      this.isInitialized = true;
      console.log('✅ JournalBrick initialized successfully');
      console.log(`📁 Connected to bucket: ${this.config.bucketName}`);

      // Publish initialization success
      this.eventBusInstance.publish('journal:initialized', {
        success: true,
        bucketName: this.config.bucketName
      });

    } catch (error) {
      console.error('❌ JournalBrick initialization failed:', error);
      
      // Update state bus with error
      this.stateBusInstance.set('journal:initialized', false);
      this.stateBusInstance.set('journal:error', error instanceof Error ? error.message : 'Unknown error');

      // Publish initialization failure
      this.eventBusInstance.publish('journal:initialized', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.errorBusInstance.reportFatal(error as Error, 'JournalBrick.initialize');
      throw error;
    }
  }

  /**
   * Store machine trim response to journal bucket
   */
  async store(
    machineTrimResponse: MachineTrimResponse, 
    metadata: {
      turnId: string;
      persona: string;
      model: string;
      timestamp: number;
    }
  ): Promise<JournalOperationResult> {
    if (!this.isInitialized) {
      throw new Error('JournalBrick not initialized');
    }

    try {
      console.log(`📝 Storing machine trim for turn: ${metadata.turnId}`);

      // Calculate compression metrics
      const originalLength = machineTrimResponse.user_message.length + 
                           (machineTrimResponse.ai_response.length * 3); // Estimate original response length
      const compressedLength = machineTrimResponse.user_message.length + 
                             machineTrimResponse.ai_response.length;
      const compressionRatio = originalLength > 0 ? compressedLength / originalLength : 1;

      // Create journal entry
      const entry: JournalEntry = {
        id: `journal-${metadata.turnId}`,
        turnId: metadata.turnId,
        timestamp: metadata.timestamp,
        user_message: machineTrimResponse.user_message,
        ai_response: machineTrimResponse.ai_response,
        inferability: machineTrimResponse.inferability,
        metadata: {
          persona: metadata.persona,
          model: metadata.model,
          original_length: originalLength,
          compressed_length: compressedLength,
          compression_ratio: compressionRatio
        }
      };

      // Store to R2
      const result = await this.r2Service.store(entry);

      // Publish success/failure event
      const storeEvent: JournalStoreEvent = {
        turnId: metadata.turnId,
        success: result.success,
        key: result.key,
        error: result.error
      };

      this.eventBusInstance.publish('journal:stored', storeEvent);

      if (!result.success && result.error) {
        this.errorBusInstance.report(new Error(result.error), 'JournalBrick.store', 'warning');
      }

      return result;

    } catch (error) {
      console.error('❌ Failed to store machine trim:', error);
      
      const storeEvent: JournalStoreEvent = {
        turnId: metadata.turnId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.eventBusInstance.publish('journal:stored', storeEvent);
      this.errorBusInstance.report(error as Error, 'JournalBrick.store', 'warning');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Retrieve machine trim response by turnId
   */
  async retrieve(turnId: string): Promise<JournalEntry | null> {
    if (!this.isInitialized) {
      throw new Error('JournalBrick not initialized');
    }

    try {
      console.log(`📖 Retrieving machine trim for turn: ${turnId}`);
      const entry = await this.r2Service.retrieve(turnId);
      
      if (entry) {
        console.log(`✅ Machine trim retrieved: ${turnId}`);
      } else {
        console.log(`📭 Machine trim not found: ${turnId}`);
      }

      return entry;

    } catch (error) {
      console.error('❌ Failed to retrieve machine trim:', error);
      this.errorBusInstance.report(error as Error, 'JournalBrick.retrieve', 'warning');
      return null;
    }
  }

  /**
   * Delete machine trim response by turnId
   */
  async delete(turnId: string): Promise<JournalOperationResult> {
    if (!this.isInitialized) {
      throw new Error('JournalBrick not initialized');
    }

    try {
      console.log(`🗑️ Deleting machine trim for turn: ${turnId}`);
      const result = await this.r2Service.delete(turnId);

      // Publish delete event
      const deleteEvent: JournalDeleteEvent = {
        turnId,
        success: result.success,
        error: result.error
      };

      this.eventBusInstance.publish('journal:deleted', deleteEvent);

      if (!result.success && result.error) {
        this.errorBusInstance.report(new Error(result.error), 'JournalBrick.delete', 'warning');
      }

      return result;

    } catch (error) {
      console.error('❌ Failed to delete machine trim:', error);

      const deleteEvent: JournalDeleteEvent = {
        turnId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.eventBusInstance.publish('journal:deleted', deleteEvent);
      this.errorBusInstance.report(error as Error, 'JournalBrick.delete', 'warning');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * List recent machine trim entries
   */
  async list(limit: number = 100): Promise<JournalListResult> {
    if (!this.isInitialized) {
      throw new Error('JournalBrick not initialized');
    }

    try {
      console.log(`📋 Listing recent machine trims (limit: ${limit})`);
      const result = await this.r2Service.list(limit);
      
      console.log(`✅ Retrieved ${result.entries.length} machine trim entries`);
      return result;

    } catch (error) {
      console.error('❌ Failed to list machine trims:', error);
      this.errorBusInstance.report(error as Error, 'JournalBrick.list', 'warning');
      
      return {
        entries: [],
        hasMore: false
      };
    }
  }

  /**
   * Check if JournalBrick is ready for operations
   */
  get ready(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  get configuration(): JournalConfig {
    return { ...this.config };
  }
}