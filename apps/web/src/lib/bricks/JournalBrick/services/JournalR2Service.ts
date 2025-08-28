/**
 * JournalR2Service - R2 operations for atomicaether-journal bucket
 * Thin wrapper over AWS S3 SDK following Essential Boss Rule 3
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { JournalEntry, JournalConfig, JournalOperationResult, JournalListResult } from '../types/JournalTypes';

export class JournalR2Service {
  private s3Client: S3Client | null = null;
  private config: JournalConfig;

  constructor(config: JournalConfig) {
    this.config = config;
  }

  /**
   * Initialize S3 client with R2 credentials
   */
  async initialize(accessKeyId: string, secretAccessKey: string): Promise<void> {
    this.s3Client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  /**
   * Store journal entry to R2 bucket
   */
  async store(entry: JournalEntry): Promise<JournalOperationResult> {
    if (!this.s3Client) {
      throw new Error('JournalR2Service not initialized');
    }

    try {
      const key = this.generateKey(entry.turnId, entry.timestamp);
      const body = JSON.stringify(entry, null, 2);

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: body,
        ContentType: 'application/json'
      }));

      console.log(`📝 Journal entry stored: ${key}`);

      return {
        success: true,
        key,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ Failed to store journal entry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Retrieve journal entry by turnId
   */
  async retrieve(turnId: string): Promise<JournalEntry | null> {
    if (!this.s3Client) {
      throw new Error('JournalR2Service not initialized');
    }

    // Try multiple date possibilities (last 7 days for timezone edge cases)
    const possibleKeys = this.generatePossibleKeys(turnId);

    for (const key of possibleKeys) {
      try {
        const response = await this.s3Client.send(new GetObjectCommand({
          Bucket: this.config.bucketName,
          Key: key
        }));

        if (response.Body) {
          const content = await response.Body.transformToString();
          const entry = JSON.parse(content) as JournalEntry;
          console.log(`📖 Journal entry retrieved: ${key}`);
          return entry;
        }

      } catch (error: any) {
        if (error.name === 'NoSuchKey') {
          continue; // Try next possible key
        }
        throw error; // Unexpected error
      }
    }

    console.log(`📭 Journal entry not found: ${turnId}`);
    return null;
  }

  /**
   * Delete journal entry by turnId
   */
  async delete(turnId: string): Promise<JournalOperationResult> {
    if (!this.s3Client) {
      throw new Error('JournalR2Service not initialized');
    }

    const possibleKeys = this.generatePossibleKeys(turnId);

    for (const key of possibleKeys) {
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.config.bucketName,
          Key: key
        }));

        console.log(`🗑️ Journal entry deleted: ${key}`);
        return {
          success: true,
          key,
          timestamp: Date.now()
        };

      } catch (error: any) {
        if (error.name === 'NoSuchKey') {
          continue; // Try next possible key
        }

        console.error('❌ Failed to delete journal entry:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        };
      }
    }

    return {
      success: false,
      error: `Journal entry not found: ${turnId}`,
      timestamp: Date.now()
    };
  }

  /**
   * List recent journal entries
   */
  async list(limit: number = 100): Promise<JournalListResult> {
    if (!this.s3Client) {
      throw new Error('JournalR2Service not initialized');
    }

    try {
      const response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: 'entries/',
        MaxKeys: Math.min(limit * 2, 1000) // Fetch extra for filtering
      }));

      const objects = response.Contents || [];
      const entries: JournalEntry[] = [];

      // Fetch entry contents in parallel batches
      const batchSize = 10;
      for (let i = 0; i < Math.min(objects.length, limit); i += batchSize) {
        const batch = objects.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (obj) => {
          if (!obj.Key) return null;

          try {
            const getResponse = await this.s3Client!.send(new GetObjectCommand({
              Bucket: this.config.bucketName,
              Key: obj.Key
            }));

            if (getResponse.Body) {
              const content = await getResponse.Body.transformToString();
              return JSON.parse(content) as JournalEntry;
            }
          } catch (error) {
            console.error('Error fetching journal entry:', obj.Key, error);
            return null;
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        const validEntries = batchResults.filter((entry): entry is JournalEntry => entry !== null);
        entries.push(...validEntries);
      }

      // Sort by timestamp (newest first)
      entries.sort((a, b) => b.timestamp - a.timestamp);

      return {
        entries: entries.slice(0, limit),
        hasMore: response.IsTruncated || false,
        nextToken: response.NextContinuationToken
      };

    } catch (error) {
      console.error('❌ Failed to list journal entries:', error);
      return {
        entries: [],
        hasMore: false
      };
    }
  }

  /**
   * Generate R2 key for journal entry (date-organized)
   */
  private generateKey(turnId: string, timestamp: number): string {
    if (!this.config.dateOrganized) {
      return `entries/${turnId}.json`;
    }

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `entries/${year}/${month}/${day}/${turnId}.json`;
  }

  /**
   * Generate possible keys for retrieval (handles timezone edge cases)
   */
  private generatePossibleKeys(turnId: string): string[] {
    if (!this.config.dateOrganized) {
      return [`entries/${turnId}.json`];
    }

    const keys: string[] = [];
    const now = new Date();
    
    // Check last 7 days for timezone edge cases
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      keys.push(`entries/${year}/${month}/${day}/${turnId}.json`);
    }

    return keys;
  }
}