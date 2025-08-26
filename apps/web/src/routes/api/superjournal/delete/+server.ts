import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { JournalEntry } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Delete Endpoint
 * Implements soft delete by updating the original entry with deletedAt timestamp
 * This preserves immutability while allowing logical deletion
 */

// Import R2 credentials from environment
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_SUPERJOURNAL_BUCKET = import.meta.env.VITE_R2_SUPERJOURNAL_BUCKET;

// Initialize S3 client for R2
const s3Client = R2_ENDPOINT ? new S3Client({
  endpoint: R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || ''
  }
}) : null;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { turnId } = await request.json();
    
    if (!turnId) {
      return json({
        success: false,
        error: 'Missing turnId'
      }, { status: 400 });
    }
    
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      console.error('🧠 SuperJournal: R2 not configured for deletion');
      return json({
        success: false,
        error: 'R2 storage not configured'
      }, { status: 500 });
    }
    
    // Find the original entry
    const originalEntry = await findEntryByTurnId(s3Client, R2_SUPERJOURNAL_BUCKET, turnId);
    
    if (!originalEntry) {
      return json({
        success: false,
        error: 'Entry not found'
      }, { status: 404 });
    }
    
    // Create updated entry with deletedAt timestamp
    const updatedEntry: JournalEntry = {
      ...originalEntry,
      deletedAt: Date.now(),
      status: 'deleted'
    };
    
    // Generate new R2 key for the updated entry (versioned)
    const date = new Date(originalEntry.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const updatedKey = `entries/${year}/${month}/${day}/${originalEntry.id}-${originalEntry.timestamp}-deleted-${Date.now()}.json`;
    
    // Write the updated entry
    const putCommand = new PutObjectCommand({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      Key: updatedKey,
      Body: JSON.stringify(updatedEntry, null, 2),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        originalId: originalEntry.id,
        turnNumber: String(originalEntry.turnNumber),
        deletedAt: String(Date.now()),
        status: 'deleted'
      }
    });
    
    await s3Client.send(putCommand);
    
    console.log('🧠 SuperJournal: Soft deleted entry:', turnId);
    
    return json({
      success: true,
      turnId,
      message: 'Entry soft deleted',
      updatedKey
    });
    
  } catch (error) {
    console.error('🧠 SuperJournal: Delete error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

/**
 * Find an entry by turnId by scanning all entries
 * This is expensive but necessary for accurate deletion
 */
async function findEntryByTurnId(
  s3Client: S3Client,
  bucket: string,
  turnId: string
): Promise<JournalEntry | null> {
  try {
    // Start from today and work backwards to find the entry
    const today = new Date();
    let daysScanned = 0;
    const maxDays = 90; // Scan up to 90 days back
    
    while (daysScanned < maxDays) {
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
        for (const object of listed.Contents) {
          if (object.Key && object.Key.includes(turnId)) {
            // Get the object
            const getCommand = new GetObjectCommand({
              Bucket: bucket,
              Key: object.Key
            });
            
            const result = await s3Client.send(getCommand);
            const bodyString = await result.Body?.transformToString();
            
            if (bodyString) {
              const entry = JSON.parse(bodyString) as JournalEntry;
              if (entry.id === turnId) {
                return entry;
              }
            }
          }
        }
      }
      
      // Move to previous day
      today.setDate(today.getDate() - 1);
      daysScanned++;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding entry by turnId:', error);
    return null;
  }
}