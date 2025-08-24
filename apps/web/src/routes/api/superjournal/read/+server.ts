import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import type { JournalEntry, ReadResponse } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Read Endpoint
 * Read-only access to deep memory
 * Cannot modify. Cannot delete. Only remember.
 */

// Import R2 credentials from environment
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_SUPERJOURNAL_BUCKET = import.meta.env.VITE_R2_SUPERJOURNAL_BUCKET;

// Initialize S3 client for R2 (S3-compatible)
const s3Client = R2_ENDPOINT ? new S3Client({
  endpoint: R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || ''
  }
}) : null;

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Parse query parameters
    const startTime = url.searchParams.get('startTime');
    const endTime = url.searchParams.get('endTime');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sessionId = url.searchParams.get('sessionId');
    
    // Check if R2 is configured
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      console.log('🧠 SuperJournal: R2 not configured for read');
      return json({
        entries: [],
        total: 0,
        hasMore: false
      } as ReadResponse);
    }
    
    // List objects based on time range
    let entries: JournalEntry[] = [];
    
    if (startTime && endTime) {
      // Time-based query
      entries = await readTimeRange(s3Client, R2_SUPERJOURNAL_BUCKET, parseInt(startTime), parseInt(endTime), limit, offset);
    } else {
      // Get recent entries
      entries = await readRecent(s3Client, R2_SUPERJOURNAL_BUCKET, limit, offset);
    }
    
    // Filter by session if specified
    if (sessionId) {
      entries = entries.filter(e => e.metadata.sessionId === sessionId);
    }
    
    return json({
      entries: entries,
      total: entries.length,
      hasMore: entries.length === limit
    } as ReadResponse);
    
  } catch (error) {
    console.error('🧠 SuperJournal: Read error:', error);
    
    return json({
      entries: [],
      total: 0,
      hasMore: false
    } as ReadResponse, { status: 500 });
  }
};

/**
 * Read entries within a time range
 */
async function readTimeRange(
  s3Client: S3Client,
  bucket: string,
  startTime: number,
  endTime: number,
  limit: number,
  offset: number
): Promise<JournalEntry[]> {
  const entries: JournalEntry[] = [];
  
  // Generate date range to scan
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const prefix = `entries/${year}/${month}/${day}/`;
    
    // List objects for this day
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000
    });
    
    const listed = await s3Client.send(listCommand);
    
    if (listed.Contents) {
      for (const object of listed.Contents) {
        if (object.Key) {
          // Get the object
          const getCommand = new GetObjectCommand({
            Bucket: bucket,
            Key: object.Key
          });
          
          const result = await s3Client.send(getCommand);
          const bodyString = await result.Body?.transformToString();
          
          if (bodyString) {
            const entry = JSON.parse(bodyString) as JournalEntry;
            
            // Check if within time range
            if (entry.timestamp >= startTime && entry.timestamp <= endTime) {
              entries.push(entry);
            }
          }
        }
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Sort by timestamp (newest first)
  entries.sort((a, b) => b.timestamp - a.timestamp);
  
  // Apply pagination
  return entries.slice(offset, offset + limit);
}

/**
 * Read recent entries
 */
async function readRecent(
  s3Client: S3Client,
  bucket: string,
  limit: number,
  offset: number
): Promise<JournalEntry[]> {
  const entries: JournalEntry[] = [];
  
  // Start from today and work backwards
  const today = new Date();
  let daysScanned = 0;
  const maxDays = 30;  // Scan up to 30 days back
  
  while (entries.length < (offset + limit) && daysScanned < maxDays) {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `entries/${year}/${month}/${day}/`;
    
    // List objects for this day
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000
    });
    
    const listed = await s3Client.send(listCommand);
    
    if (listed.Contents) {
      // Batch fetch all objects in parallel
      const fetchPromises = listed.Contents
        .filter(obj => obj.Key)
        .slice(0, (offset + limit) - entries.length)  // Only fetch what we need
        .map(async (object) => {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: bucket,
              Key: object.Key!
            });
            
            const result = await s3Client.send(getCommand);
            const bodyString = await result.Body?.transformToString();
            
            if (bodyString) {
              return JSON.parse(bodyString) as JournalEntry;
            }
          } catch (err) {
            console.error(`Failed to fetch ${object.Key}:`, err);
            return null;
          }
        });
      
      // Wait for all fetches to complete in parallel
      const dayEntries = await Promise.all(fetchPromises);
      
      // Add non-null entries
      for (const entry of dayEntries) {
        if (entry) {
          entries.push(entry);
          if (entries.length >= (offset + limit)) {
            break;
          }
        }
      }
    }
    
    // Move to previous day
    today.setDate(today.getDate() - 1);
    daysScanned++;
  }
  
  // Sort by timestamp (oldest first for display)
  entries.sort((a, b) => a.timestamp - b.timestamp);
  
  // Apply pagination
  return entries.slice(offset, offset + limit);
}