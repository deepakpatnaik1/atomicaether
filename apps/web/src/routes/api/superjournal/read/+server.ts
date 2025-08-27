/**
 * SuperJournal Read API - High-Performance R2 Message History Loader
 * CLAUDE.md Compliant: Thin wrapper over AWS S3 SDK with smart pagination
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { 
  VITE_R2_ACCESS_KEY_ID,
  VITE_R2_SECRET_ACCESS_KEY,
  VITE_R2_SUPERJOURNAL_BUCKET,
  VITE_R2_ENDPOINT
} from '$env/static/private';

interface JournalEntry {
  id: string;
  type: 'message-turn';
  timestamp: number;
  bossMessage: string;
  samaraMessage: string;
  metadata?: {
    model?: string;
    persona?: string;
    streamDuration?: number;
  };
  turnNumber?: number;
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '1000');
    const after = url.searchParams.get('after') || '';
    const before = url.searchParams.get('before') || '';
    
    // Environment validation
    const accessKeyId = VITE_R2_ACCESS_KEY_ID || '';
    const secretAccessKey = VITE_R2_SECRET_ACCESS_KEY || '';
    const bucket = VITE_R2_SUPERJOURNAL_BUCKET || 'atomicaether-superjournal';
    const endpoint = VITE_R2_ENDPOINT || '';
    
    if (!accessKeyId || !secretAccessKey || !endpoint) {
      return json({ 
        success: false, 
        error: 'R2 credentials not configured',
        entries: []
      }, { status: 500 });
    }
    
    // Create R2 client
    const s3 = new S3Client({
      endpoint,
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    // List objects with pagination support
    const listParams: any = {
      Bucket: bucket,
      Prefix: 'entries/',
      MaxKeys: Math.min(limit * 2, 2000), // Fetch extra for filtering
    };
    
    if (after) {
      listParams.StartAfter = after;
    }
    
    const listResponse = await s3.send(new ListObjectsV2Command(listParams));
    const objects = listResponse.Contents || [];
    
    // Filter objects by date range if specified
    let filteredObjects = objects;
    if (before) {
      filteredObjects = objects.filter(obj => (obj.Key || '') < before);
    }
    
    // Sort by key (which includes timestamp in the path) and limit
    const sortedObjects = filteredObjects
      .sort((a, b) => (a.Key || '').localeCompare(b.Key || ''))
      .slice(0, limit);
    
    // Batch fetch object contents with parallel processing
    const entries: JournalEntry[] = [];
    const batchSize = 10; // Process 10 objects at a time
    
    for (let i = 0; i < sortedObjects.length; i += batchSize) {
      const batch = sortedObjects.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (obj) => {
        try {
          if (!obj.Key) return null;
          
          const getResponse = await s3.send(new GetObjectCommand({
            Bucket: bucket,
            Key: obj.Key
          }));
          
          if (!getResponse.Body) return null;
          
          const content = await getResponse.Body.transformToString();
          const data = JSON.parse(content);
          
          
          // Convert to JournalEntry format expected by MessageScrollback
          const entry: JournalEntry = {
            id: data.id,
            type: 'message-turn',
            timestamp: data.timestamp,
            bossMessage: data.userMessage || data.bossMessage || '',
            samaraMessage: data.assistantMessage || data.samaraMessage || '',
            metadata: {
              model: data.model,
              persona: data.persona,
              streamDuration: data.processingTime
            },
            turnNumber: data.turnNumber
          };
          
          return entry;
        } catch (error) {
          console.error('Error fetching object:', obj.Key, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validEntries = batchResults.filter((entry): entry is JournalEntry => entry !== null);
      entries.push(...validEntries);
    }
    
    // Final sort by timestamp (chronological order)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate lastModified timestamp for cache validation
    let lastModified = 0;
    for (const entry of entries) {
      const entryModified = Math.max(entry.timestamp, entry.metadata?.savedAt || 0);
      if (entryModified > lastModified) {
        lastModified = entryModified;
      }
    }
    
    return json({
      success: true,
      entries,
      metadata: {
        count: entries.length,
        hasMore: listResponse.IsTruncated,
        nextContinuationToken: listResponse.NextContinuationToken,
        lastKey: sortedObjects[sortedObjects.length - 1]?.Key,
        lastModified
      }
    });
    
  } catch (error) {
    console.error('SuperJournal read error:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      entries: []
    }, { status: 500 });
  }
};