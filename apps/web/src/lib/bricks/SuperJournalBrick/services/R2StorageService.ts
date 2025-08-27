/**
 * SuperJournal v2 - R2 Storage Service
 * Thin wrapper over AWS S3 client for Cloudflare R2 operations
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { 
  MessagePairEntry, 
  SaveResponse, 
  ReadQuery, 
  ReadResponse,
  SuperJournalConfig 
} from '../models/MessagePairEntry';

export class R2StorageService {
  private s3Client: S3Client;
  
  constructor(private config: SuperJournalConfig) {
    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: 'auto',
      credentials: {
        accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || ''
      }
    });
  }

  /**
   * Save message pair entry to R2
   */
  async saveMessagePair(entry: MessagePairEntry): Promise<SaveResponse> {
    try {
      // Compute SHA-256 checksum for integrity using Web Crypto API
      const contentToHash = JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        timezone: entry.timezone,
        userMessage: entry.userMessage,
        assistantMessage: entry.assistantMessage,
        status: entry.status
      });
      entry.metadata.checksum = await this.computeChecksum(contentToHash);

      // Generate R2 key with date-based structure
      const date = new Date(entry.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const r2Key = `entries/${year}/${month}/${day}/${entry.id}-${entry.timestamp}.json`;

      // Save to R2
      const putCommand = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: r2Key,
        Body: JSON.stringify(entry, null, 2),
        ContentType: 'application/json',
        CacheControl: entry.status === 'active' ? 'public, max-age=3600' : 'no-cache',
        Metadata: {
          entryId: entry.id,
          status: entry.status,
          timestamp: String(entry.timestamp),
          checksum: entry.metadata.checksum
        }
      });

      await this.s3Client.send(putCommand);

      return {
        success: true,
        entryId: entry.id,
        timestamp: entry.timestamp,
        r2Key: r2Key
      };

    } catch (error) {
      return {
        success: false,
        entryId: entry.id,
        timestamp: entry.timestamp,
        r2Key: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update entry status (for soft delete/restore)
   */
  async updateEntryStatus(entryId: string, newStatus: 'active' | 'deleted'): Promise<SaveResponse> {
    try {
      // First, find the entry by scanning recent entries
      const entry = await this.findEntryById(entryId);
      if (!entry) {
        throw new Error(`Entry ${entryId} not found`);
      }

      // Update status
      entry.status = newStatus;
      
      // Re-save with updated status
      return await this.saveMessagePair(entry);

    } catch (error) {
      return {
        success: false,
        entryId: entryId,
        timestamp: Date.now(),
        r2Key: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Read entries with filtering
   */
  async readEntries(query: ReadQuery = {}): Promise<ReadResponse> {
    try {
      const {
        startTime,
        endTime,
        status = 'active',
        limit = 100,
        offset = 0,
        sessionId
      } = query;

      const entries: MessagePairEntry[] = [];
      
      // Determine date range to scan
      const endDate = endTime ? new Date(endTime) : new Date();
      const startDate = startTime ? new Date(startTime) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Scan date range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate && entries.length < (offset + limit)) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const prefix = `entries/${year}/${month}/${day}/`;

        // List objects for this day
        const listCommand = new ListObjectsV2Command({
          Bucket: this.config.bucketName,
          Prefix: prefix,
          MaxKeys: 1000
        });

        try {
          const listed = await this.s3Client.send(listCommand);
          
          if (listed.Contents) {
            // Fetch entries in parallel
            const fetchPromises = listed.Contents
              .filter(obj => obj.Key)
              .map(async (object) => {
                try {
                  const getCommand = new GetObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: object.Key!
                  });
                  
                  const result = await this.s3Client.send(getCommand);
                  const bodyString = await result.Body?.transformToString();
                  
                  if (bodyString) {
                    const entry = JSON.parse(bodyString) as MessagePairEntry;
                    
                    // Apply filters
                    if (startTime && entry.timestamp < startTime) return null;
                    if (endTime && entry.timestamp > endTime) return null;
                    if (status !== 'all' && entry.status !== status) return null;
                    if (sessionId && entry.metadata.sessionId !== sessionId) return null;
                    
                    // Verify integrity
                    if (await this.verifyIntegrity(entry)) {
                      return entry;
                    }
                  }
                  return null;
                } catch (err) {
                  return null;
                }
              });
            
            const dayEntries = await Promise.all(fetchPromises);
            entries.push(...dayEntries.filter(entry => entry !== null) as MessagePairEntry[]);
          }
        } catch (err) {
          // Ignore scan errors
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Sort by timestamp (newest first)
      entries.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      const paginatedEntries = entries.slice(offset, offset + limit);

      return {
        entries: paginatedEntries,
        total: entries.length,
        hasMore: entries.length > (offset + limit)
      };

    } catch (error) {
      return {
        entries: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * Find entry by ID (scan recent entries)
   */
  private async findEntryById(entryId: string): Promise<MessagePairEntry | null> {
    // Scan last 7 days for the entry
    const endTime = Date.now();
    const startTime = endTime - (7 * 24 * 60 * 60 * 1000);
    
    const response = await this.readEntries({ 
      startTime, 
      endTime, 
      status: 'all',
      limit: 1000 
    });
    
    return response.entries.find(entry => entry.id === entryId) || null;
  }

  /**
   * Verify data integrity using checksum
   */
  private async verifyIntegrity(entry: MessagePairEntry): Promise<boolean> {
    try {
      const contentToHash = JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        timezone: entry.timezone,
        userMessage: entry.userMessage,
        assistantMessage: entry.assistantMessage,
        status: entry.status
      });
      
      const computedChecksum = await this.computeChecksum(contentToHash);
      return computedChecksum === entry.metadata.checksum;
    } catch (error) {
      return false; // Assume corrupt if verification fails
    }
  }

  /**
   * Compute SHA-256 checksum using Web Crypto API
   */
  private async computeChecksum(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}