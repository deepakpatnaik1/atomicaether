import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import type { JournalEntry } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Deleted Entries Endpoint
 * Read deleted entries for the recycle bin
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

export const GET: RequestHandler = async () => {
  try {
    // Check if R2 is configured
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      return json({ entries: [] });
    }
    
    // Get list of deleted turn IDs
    const deletedTurnIds = await getDeletedTurns(s3Client, R2_SUPERJOURNAL_BUCKET);
    
    if (deletedTurnIds.length === 0) {
      return json({ entries: [] });
    }
    
    
    // Fetch the actual entries for deleted turns
    const deletedEntries: JournalEntry[] = [];
    
    // We need to scan all entries to find the deleted ones
    // This is not optimal but necessary since we don't store deletion metadata
    const allEntries = await scanAllEntries(s3Client, R2_SUPERJOURNAL_BUCKET);
    
    // Filter to only deleted entries
    for (const entry of allEntries) {
      if (deletedTurnIds.includes(entry.id)) {
        deletedEntries.push(entry);
      }
    }
    
    
    return json({ 
      entries: deletedEntries,
      deletedTurnIds 
    });
    
  } catch (error) {
    console.error('🗑️ RecycleBin: Error fetching deleted entries:', error);
    return json({ entries: [] }, { status: 500 });
  }
};

/**
 * Get list of deleted turn IDs from manifest
 */
async function getDeletedTurns(
  s3Client: S3Client,
  bucket: string
): Promise<string[]> {
  try {
    const manifestKey = 'manifests/deletions.json';
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: manifestKey
    });
    
    const result = await s3Client.send(getCommand);
    const bodyString = await result.Body?.transformToString();
    
    if (bodyString) {
      const manifest = JSON.parse(bodyString);
      return manifest.deletedTurns || [];
    }
  } catch (err) {
  }
  
  return [];
}

/**
 * Scan all entries (limited to recent for performance)
 */
async function scanAllEntries(
  s3Client: S3Client,
  bucket: string
): Promise<JournalEntry[]> {
  const entries: JournalEntry[] = [];
  
  // Scan last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
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
    
    try {
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
              entries.push(entry);
            }
          }
        }
      }
    } catch (err) {
      console.error(`🗑️ RecycleBin: Error scanning ${prefix}:`, err);
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return entries;
}