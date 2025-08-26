import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { JournalEntry } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Restore Endpoint
 * 
 * BOSS REQUIREMENT: Restore functionality for soft-deleted entries
 * - Removes deleted markers from SuperJournal entries (sets status: 'active', removes deletedAt)
 * - Removes deleted markers from corresponding Journal entries for referential integrity
 * - Allows messages to appear in scrollback again after being in RecycleBin
 * - Essentially reverses the soft-delete operation
 * - Does not modify the data itself, only the deletion status
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

interface RestoreRequest {
  turnId: string;  // BOSS REQUIREMENT: Turn ID to restore from soft-delete
}

interface RestoreResponse {
  success: boolean;
  turnId: string;
  restoredAt: number;
  restoredFromSuperJournal: boolean;
  restoredFromJournal: boolean;
  error?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { turnId }: RestoreRequest = await request.json();
    
    // VALIDATION: Ensure turnId is provided
    if (!turnId) {
      return json({
        success: false,
        turnId: '',
        restoredAt: 0,
        restoredFromSuperJournal: false,
        restoredFromJournal: false,
        error: 'Turn ID is required for restore operation'
      } as RestoreResponse, { status: 400 });
    }
    
    // CHECK: Ensure R2 is configured
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      console.error('♻️ SuperJournal: R2 not configured for restore');
      return json({
        success: false,
        turnId,
        restoredAt: 0,
        restoredFromSuperJournal: false,
        restoredFromJournal: false,
        error: 'R2 storage not configured'
      } as RestoreResponse, { status: 500 });
    }
    
    const restoredAt = Date.now();
    console.log(`♻️ SuperJournal: Starting restore operation for turn ${turnId}`);
    
    // STEP 1: Restore SuperJournal entry (remove deleted markers)
    const superJournalRestored = await restoreSuperJournalEntry(turnId);
    if (!superJournalRestored) {
      return json({
        success: false,
        turnId,
        restoredAt: 0,
        restoredFromSuperJournal: false,
        restoredFromJournal: false,
        error: 'Failed to restore SuperJournal entry - entry not found or not deleted'
      } as RestoreResponse, { status: 404 });
    }
    
    // STEP 2: Restore Journal entries (remove deleted markers for referential integrity)
    // NOTE: Journal entries may not exist for all SuperJournal entries
    // This is non-blocking - if journal entry doesn't exist, we continue
    const journalRestored = await restoreJournalEntries(turnId);
    
    console.log(`✅ SuperJournal: Restored turn ${turnId} at ${restoredAt}`);
    console.log(`📊 Results: SuperJournal=${superJournalRestored}, Journal=${journalRestored}`);
    
    return json({
      success: true,
      turnId,
      restoredAt,
      restoredFromSuperJournal: superJournalRestored,
      restoredFromJournal: journalRestored
    } as RestoreResponse);
    
  } catch (error) {
    console.error('♻️ SuperJournal: Restore error:', error);
    
    return json({
      success: false,
      turnId: '',
      restoredAt: 0,
      restoredFromSuperJournal: false,
      restoredFromJournal: false,
      error: error instanceof Error ? error.message : 'Unknown restore error'
    } as RestoreResponse, { status: 500 });
  }
};

/**
 * RESTORE SUPERJOURNAL ENTRY
 * 
 * BOSS REQUIREMENT: Remove soft-delete markers from SuperJournal entry
 * - Finds the soft-deleted entry by turnId in R2 SuperJournal bucket
 * - Removes deletedAt timestamp and sets status to 'active'
 * - Re-writes the entry with restored metadata
 * - Entry will now appear in normal SuperJournal reads (not onlyDeleted)
 */
async function restoreSuperJournalEntry(turnId: string): Promise<boolean> {
  try {
    console.log(`🔍 SuperJournal: Searching for soft-deleted entry ${turnId}...`);
    
    // SEARCH STRATEGY: List objects and check for soft-deleted entries
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
    
    // FIND SOFT-DELETED ENTRY: Look for entry with matching turnId that is soft-deleted
    let targetKey: string | null = null;
    let existingEntry: JournalEntry | null = null;
    
    for (const obj of listResponse.Contents) {
      if (!obj.Key) continue;
      
      try {
        // FETCH ENTRY: Get object to check if it matches our turnId and is soft-deleted
        const getCommand = new GetObjectCommand({
          Bucket: R2_SUPERJOURNAL_BUCKET,
          Key: obj.Key
        });
        
        const getResponse = await s3Client!.send(getCommand);
        const entryData = await getResponse.Body?.transformToString();
        
        if (entryData) {
          const entry: JournalEntry = JSON.parse(entryData);
          
          // CHECK: Is this our target entry and is it soft-deleted?
          if (entry.id === turnId && entry.deletedAt && entry.status === 'deleted') {
            targetKey = obj.Key;
            existingEntry = entry;
            console.log(`✅ SuperJournal: Found soft-deleted entry ${turnId} at ${targetKey}`);
            break;
          }
        }
      } catch (objError) {
        console.warn(`⚠️ SuperJournal: Error checking object ${obj.Key}:`, objError);
        continue;
      }
    }
    
    // CHECK: Soft-deleted entry found?
    if (!targetKey || !existingEntry) {
      console.log(`❌ SuperJournal: Soft-deleted entry ${turnId} not found`);
      return false;
    }
    
    // RESTORE ENTRY: Remove soft-delete markers
    const restoredEntry: JournalEntry = {
      ...existingEntry,
      status: 'active',              // BOSS REQUIREMENT: Set back to active status
      deletedAt: undefined           // BOSS REQUIREMENT: Remove deletion timestamp
    };
    
    // Remove the deletedAt property completely from the object
    delete restoredEntry.deletedAt;
    
    // WRITE RESTORED ENTRY: Re-upload without soft-delete markers
    const putCommand = new PutObjectCommand({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      Key: targetKey,
      Body: JSON.stringify(restoredEntry, null, 2),
      ContentType: 'application/json',
      Metadata: {
        restored: 'true',             // Add restore marker to metadata
        restoredAt: Date.now().toString()
      }
    });
    
    await s3Client!.send(putCommand);
    console.log(`✅ SuperJournal: Restored entry ${turnId} - removed soft-delete markers`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ SuperJournal: Error restoring entry ${turnId}:`, error);
    return false;
  }
}

/**
 * RESTORE JOURNAL ENTRIES
 * 
 * BOSS REQUIREMENT: Remove deleted markers from Journal entries for referential integrity
 * - Finds machine-trimmed entries in main journal bucket
 * - Removes deletedAt timestamp and sets status to 'active'
 * - Non-blocking: continues if journal entries don't exist
 * - Maintains consistency across storage systems
 */
async function restoreJournalEntries(turnId: string): Promise<boolean> {
  try {
    console.log(`🔍 Journal: Searching for soft-deleted entries ${turnId}...`);
    
    // JOURNAL SEARCH: Journal entries may have different storage structure
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
    
    // FIND MATCHING ENTRIES: Look for journal entries with turnId that are soft-deleted
    const targetEntries: Array<{ key: string; entry: any }> = [];
    
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
          
          // CHECK: Is this entry related to our turnId and soft-deleted?
          const isRelated = entry.id === turnId || entry.turnId === turnId || obj.Key.includes(turnId);
          const isSoftDeleted = entry.deletedAt && entry.status === 'deleted';
          
          if (isRelated && isSoftDeleted) {
            targetEntries.push({ key: obj.Key, entry });
            console.log(`✅ Journal: Found soft-deleted entry ${turnId} at ${obj.Key}`);
          }
        }
      } catch (objError) {
        console.warn(`⚠️ Journal: Error checking object ${obj.Key}:`, objError);
        continue;
      }
    }
    
    // RESTORE JOURNAL ENTRIES: Remove soft-delete markers from all matching entries
    let restoredCount = 0;
    
    for (const { key, entry } of targetEntries) {
      try {
        const restoredEntry = {
          ...entry,
          status: 'active',           // BOSS REQUIREMENT: Set back to active status
          deletedAt: undefined        // BOSS REQUIREMENT: Remove deletion timestamp
        };
        
        // Remove the deletedAt property completely
        delete restoredEntry.deletedAt;
        
        const putCommand = new PutObjectCommand({
          Bucket: R2_JOURNAL_BUCKET,
          Key: key,
          Body: JSON.stringify(restoredEntry, null, 2),
          ContentType: 'application/json',
          Metadata: {
            restored: 'true',
            restoredAt: Date.now().toString()
          }
        });
        
        await s3Client!.send(putCommand);
        restoredCount++;
        console.log(`✅ Journal: Restored entry at ${key}`);
        
      } catch (putError) {
        console.error(`❌ Journal: Error restoring entry at ${key}:`, putError);
      }
    }
    
    if (restoredCount > 0) {
      console.log(`✅ Journal: Successfully restored ${restoredCount} entries for ${turnId}`);
      return true;
    } else {
      console.log(`ℹ️ Journal: No soft-deleted entries found for ${turnId} (non-blocking)`);
      return false;
    }
    
  } catch (error) {
    console.error(`⚠️ Journal: Error restoring entries for ${turnId}:`, error);
    // NON-BLOCKING: Journal restore failure doesn't fail the whole operation
    return false;
  }
}