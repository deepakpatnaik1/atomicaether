import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { JournalEntry } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Soft-Delete Endpoint
 * 
 * BOSS REQUIREMENT: Soft-delete functionality for message pairs
 * - Marks entries as deleted in SuperJournal (sets deletedAt timestamp & status: 'deleted')
 * - Does NOT permanently remove data (hard-delete is separate operation)
 * - Allows recovery via restore functionality in RecycleBin
 * - Updates both SuperJournal and Journal entries for referential integrity
 */

// Import R2 credentials from environment
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_SUPERJOURNAL_BUCKET = import.meta.env.VITE_R2_SUPERJOURNAL_BUCKET;
const R2_JOURNAL_BUCKET = import.meta.env.VITE_R2_BUCKET_NAME; // Main journal bucket

// Initialize S3 client for R2 (S3-compatible)
const s3Client = R2_ENDPOINT ? new S3Client({
  endpoint: R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || ''
  }
}) : null;

interface SoftDeleteRequest {
  turnId: string;  // BOSS REQUIREMENT: Turn ID to soft-delete
}

interface SoftDeleteResponse {
  success: boolean;
  turnId: string;
  deletedAt: number;
  error?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { turnId }: SoftDeleteRequest = await request.json();
    
    // VALIDATION: Ensure turnId is provided
    if (!turnId) {
      return json({
        success: false,
        turnId: '',
        deletedAt: 0,
        error: 'Turn ID is required for soft-delete operation'
      } as SoftDeleteResponse, { status: 400 });
    }
    
    // CHECK: Ensure R2 is configured
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      console.error('🧠 SuperJournal: R2 not configured for soft-delete');
      return json({
        success: false,
        turnId,
        deletedAt: 0,
        error: 'R2 storage not configured'
      } as SoftDeleteResponse, { status: 500 });
    }
    
    const deletedAt = Date.now();
    console.log(`🗑️ SuperJournal: Starting soft-delete for turn ${turnId}`);
    
    // STEP 1: Find and update SuperJournal entry
    const superJournalUpdated = await softDeleteSuperJournalEntry(turnId, deletedAt);
    if (!superJournalUpdated) {
      return json({
        success: false,
        turnId,
        deletedAt: 0,
        error: 'Failed to soft-delete SuperJournal entry - entry not found'
      } as SoftDeleteResponse, { status: 404 });
    }
    
    // STEP 2: Find and update Journal entry (machine-trimmed version)
    // NOTE: Journal entries may not exist for all SuperJournal entries
    // This is non-blocking - if journal entry doesn't exist, we continue
    await softDeleteJournalEntry(turnId, deletedAt);
    
    console.log(`✅ SuperJournal: Soft-deleted turn ${turnId} at ${deletedAt}`);
    
    return json({
      success: true,
      turnId,
      deletedAt
    } as SoftDeleteResponse);
    
  } catch (error) {
    console.error('🧠 SuperJournal: Soft-delete error:', error);
    
    return json({
      success: false,
      turnId: '',
      deletedAt: 0,
      error: error instanceof Error ? error.message : 'Unknown soft-delete error'
    } as SoftDeleteResponse, { status: 500 });
  }
};

/**
 * SOFT-DELETE SUPERJOURNAL ENTRY
 * 
 * BOSS REQUIREMENT: Mark SuperJournal entry as deleted without removing data
 * - Finds the entry by turnId in R2 SuperJournal bucket
 * - Updates deletedAt timestamp and status to 'deleted'
 * - Re-writes the entry with updated metadata
 * - Maintains data integrity and immutability principles
 */
async function softDeleteSuperJournalEntry(turnId: string, deletedAt: number): Promise<boolean> {
  try {
    console.log(`🔍 SuperJournal: Searching for entry ${turnId} in SuperJournal...`);
    
    // SEARCH STRATEGY: List objects and check metadata for turnId
    // SuperJournal entries are stored with timestamps in path, need to search
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      Prefix: 'entries/', // All SuperJournal entries are under entries/
      MaxKeys: 1000
    });
    
    const listResponse = await s3Client!.send(listCommand);
    
    if (!listResponse.Contents) {
      console.log('🔍 SuperJournal: No entries found in bucket');
      return false;
    }
    
    // FIND ENTRY: Look for entry with matching turnId
    let targetKey: string | null = null;
    let existingEntry: JournalEntry | null = null;
    
    for (const obj of listResponse.Contents) {
      if (!obj.Key) continue;
      
      try {
        // FETCH ENTRY: Get object to check if it matches our turnId
        const getCommand = new GetObjectCommand({
          Bucket: R2_SUPERJOURNAL_BUCKET,
          Key: obj.Key
        });
        
        const getResponse = await s3Client!.send(getCommand);
        const entryData = await getResponse.Body?.transformToString();
        
        if (entryData) {
          const entry: JournalEntry = JSON.parse(entryData);
          if (entry.id === turnId) {
            targetKey = obj.Key;
            existingEntry = entry;
            console.log(`✅ SuperJournal: Found entry ${turnId} at ${targetKey}`);
            break;
          }
        }
      } catch (objError) {
        console.warn(`⚠️ SuperJournal: Error checking object ${obj.Key}:`, objError);
        continue;
      }
    }
    
    // CHECK: Entry found?
    if (!targetKey || !existingEntry) {
      console.log(`❌ SuperJournal: Entry ${turnId} not found`);
      return false;
    }
    
    // UPDATE ENTRY: Set soft-delete markers
    const updatedEntry: JournalEntry = {
      ...existingEntry,
      deletedAt,                    // BOSS REQUIREMENT: Set deletion timestamp
      status: 'deleted'             // BOSS REQUIREMENT: Mark as deleted
    };
    
    // WRITE UPDATED ENTRY: Re-upload with soft-delete markers
    const putCommand = new PutObjectCommand({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      Key: targetKey,
      Body: JSON.stringify(updatedEntry, null, 2),
      ContentType: 'application/json',
      Metadata: {
        ...getResponse.Metadata,
        softDeleted: 'true',         // Add soft-delete marker to metadata
        deletedAt: deletedAt.toString()
      }
    });
    
    await s3Client!.send(putCommand);
    console.log(`✅ SuperJournal: Updated entry ${turnId} with soft-delete markers`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ SuperJournal: Error soft-deleting entry ${turnId}:`, error);
    return false;
  }
}

/**
 * SOFT-DELETE JOURNAL ENTRY
 * 
 * BOSS REQUIREMENT: Mark corresponding Journal entry as deleted for referential integrity
 * - Finds machine-trimmed entry in main journal bucket
 * - Updates deletedAt timestamp and status to 'deleted'
 * - Non-blocking: continues if journal entry doesn't exist
 */
async function softDeleteJournalEntry(turnId: string, deletedAt: number): Promise<boolean> {
  try {
    console.log(`🔍 Journal: Searching for entry ${turnId} in Journal...`);
    
    // JOURNAL SEARCH: Journal entries may have different storage structure
    // This is a best-effort attempt to maintain referential integrity
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_JOURNAL_BUCKET,
      Prefix: 'conversations/', // Journal entries are typically under conversations/
      MaxKeys: 1000
    });
    
    const listResponse = await s3Client!.send(listCommand);
    
    if (!listResponse.Contents) {
      console.log('🔍 Journal: No entries found in journal bucket');
      return false;
    }
    
    // FIND MATCHING ENTRY: Look for journal entry with turnId
    let targetKey: string | null = null;
    let existingEntry: any = null;
    
    for (const obj of listResponse.Contents) {
      if (!obj.Key || !obj.Key.includes(turnId)) continue;
      
      try {
        const getCommand = new GetObjectCommand({
          Bucket: R2_JOURNAL_BUCKET,
          Key: obj.Key
        });
        
        const getResponse = await s3Client!.send(getCommand);
        const entryData = await getResponse.Body?.transformToString();
        
        if (entryData) {
          const entry = JSON.parse(entryData);
          // Journal entries might have different structure, check for turnId
          if (entry.id === turnId || entry.turnId === turnId || obj.Key.includes(turnId)) {
            targetKey = obj.Key;
            existingEntry = entry;
            console.log(`✅ Journal: Found entry ${turnId} at ${targetKey}`);
            break;
          }
        }
      } catch (objError) {
        console.warn(`⚠️ Journal: Error checking object ${obj.Key}:`, objError);
        continue;
      }
    }
    
    // UPDATE JOURNAL ENTRY: If found, mark as deleted
    if (targetKey && existingEntry) {
      const updatedEntry = {
        ...existingEntry,
        deletedAt,                  // BOSS REQUIREMENT: Set deletion timestamp
        status: 'deleted'           // BOSS REQUIREMENT: Mark as deleted
      };
      
      const putCommand = new PutObjectCommand({
        Bucket: R2_JOURNAL_BUCKET,
        Key: targetKey,
        Body: JSON.stringify(updatedEntry, null, 2),
        ContentType: 'application/json',
        Metadata: {
          softDeleted: 'true',
          deletedAt: deletedAt.toString()
        }
      });
      
      await s3Client!.send(putCommand);
      console.log(`✅ Journal: Updated entry ${turnId} with soft-delete markers`);
      return true;
    } else {
      console.log(`ℹ️ Journal: Entry ${turnId} not found in journal (non-blocking)`);
      return false;
    }
    
  } catch (error) {
    console.error(`⚠️ Journal: Error soft-deleting entry ${turnId}:`, error);
    // NON-BLOCKING: Journal soft-delete failure doesn't fail the whole operation
    return false;
  }
}