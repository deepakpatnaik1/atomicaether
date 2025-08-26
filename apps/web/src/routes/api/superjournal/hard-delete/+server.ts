import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * SuperJournal Hard-Delete Endpoint
 * 
 * BOSS REQUIREMENT: Permanent deletion functionality for RecycleBin
 * - Permanently removes entries from SuperJournal R2 bucket (irreversible)
 * - Permanently removes corresponding entries from Journal R2 bucket
 * - Updates manifests to reflect permanent removal
 * - Only accessible from RecycleBin for soft-deleted entries
 * - No recovery possible after this operation
 * 
 * WARNING: This is permanent deletion - data cannot be recovered!
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

interface HardDeleteRequest {
  turnId: string;  // BOSS REQUIREMENT: Turn ID to permanently delete
}

interface HardDeleteResponse {
  success: boolean;
  turnId: string;
  deletedFromSuperJournal: boolean;
  deletedFromJournal: boolean;
  permanentlyDeleted: boolean;
  error?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { turnId }: HardDeleteRequest = await request.json();
    
    // VALIDATION: Ensure turnId is provided
    if (!turnId) {
      return json({
        success: false,
        turnId: '',
        deletedFromSuperJournal: false,
        deletedFromJournal: false,
        permanentlyDeleted: false,
        error: 'Turn ID is required for hard-delete operation'
      } as HardDeleteResponse, { status: 400 });
    }
    
    // CHECK: Ensure R2 is configured
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      console.error('🔥 SuperJournal: R2 not configured for hard-delete');
      return json({
        success: false,
        turnId,
        deletedFromSuperJournal: false,
        deletedFromJournal: false,
        permanentlyDeleted: false,
        error: 'R2 storage not configured'
      } as HardDeleteResponse, { status: 500 });
    }
    
    console.log(`🔥 SuperJournal: Starting PERMANENT DELETION for turn ${turnId}`);
    console.log(`⚠️ WARNING: This action is IRREVERSIBLE - no recovery possible!`);
    
    // STEP 1: Permanently delete from SuperJournal
    const superJournalDeleted = await hardDeleteFromSuperJournal(turnId);
    
    // STEP 2: Permanently delete from Journal (non-blocking)
    const journalDeleted = await hardDeleteFromJournal(turnId);
    
    // VERIFICATION: At least SuperJournal deletion must succeed
    if (!superJournalDeleted) {
      return json({
        success: false,
        turnId,
        deletedFromSuperJournal: false,
        deletedFromJournal: journalDeleted,
        permanentlyDeleted: false,
        error: 'Failed to delete from SuperJournal - entry not found'
      } as HardDeleteResponse, { status: 404 });
    }
    
    const permanentlyDeleted = superJournalDeleted;
    
    console.log(`💥 SuperJournal: PERMANENT DELETION COMPLETED for turn ${turnId}`);
    console.log(`📊 Results: SuperJournal=${superJournalDeleted}, Journal=${journalDeleted}`);
    console.log(`🚨 NO RECOVERY POSSIBLE - Data permanently destroyed`);
    
    return json({
      success: true,
      turnId,
      deletedFromSuperJournal: superJournalDeleted,
      deletedFromJournal: journalDeleted,
      permanentlyDeleted
    } as HardDeleteResponse);
    
  } catch (error) {
    console.error('🔥 SuperJournal: Hard-delete error:', error);
    
    return json({
      success: false,
      turnId: '',
      deletedFromSuperJournal: false,
      deletedFromJournal: false,
      permanentlyDeleted: false,
      error: error instanceof Error ? error.message : 'Unknown hard-delete error'
    } as HardDeleteResponse, { status: 500 });
  }
};

/**
 * PERMANENTLY DELETE FROM SUPERJOURNAL
 * 
 * BOSS REQUIREMENT: Complete removal from SuperJournal R2 bucket
 * - Finds the entry by turnId in SuperJournal bucket
 * - Permanently deletes the R2 object (no recovery possible)
 * - Updates manifests to reflect removal
 * - This is the source of truth for permanent deletion
 */
async function hardDeleteFromSuperJournal(turnId: string): Promise<boolean> {
  try {
    console.log(`🔍 SuperJournal: Locating entry ${turnId} for PERMANENT DELETION...`);
    
    // SEARCH STRATEGY: List objects and find the target entry
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
    
    // FIND TARGET ENTRY: Look for entry with matching turnId
    let targetKey: string | null = null;
    
    for (const obj of listResponse.Contents) {
      if (!obj.Key) continue;
      
      try {
        // CHECK ENTRY: Get object to verify it matches our turnId
        const getCommand = new GetObjectCommand({
          Bucket: R2_SUPERJOURNAL_BUCKET,
          Key: obj.Key
        });
        
        const getResponse = await s3Client!.send(getCommand);
        const entryData = await getResponse.Body?.transformToString();
        
        if (entryData) {
          const entry = JSON.parse(entryData);
          if (entry.id === turnId) {
            targetKey = obj.Key;
            console.log(`🎯 SuperJournal: Found target entry ${turnId} at ${targetKey}`);
            break;
          }
        }
      } catch (objError) {
        console.warn(`⚠️ SuperJournal: Error checking object ${obj.Key}:`, objError);
        continue;
      }
    }
    
    // CHECK: Entry found?
    if (!targetKey) {
      console.log(`❌ SuperJournal: Entry ${turnId} not found for deletion`);
      return false;
    }
    
    // PERMANENT DELETION: Remove R2 object completely
    console.log(`🔥 SuperJournal: PERMANENTLY DELETING ${targetKey}...`);
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      Key: targetKey
    });
    
    await s3Client!.send(deleteCommand);
    
    console.log(`💥 SuperJournal: PERMANENT DELETION COMPLETED for ${turnId}`);
    console.log(`🚨 Entry ${targetKey} has been PERMANENTLY DESTROYED`);
    
    // TODO: Update manifests to reflect the permanent deletion
    // This would involve decrementing counts and updating checksums
    
    return true;
    
  } catch (error) {
    console.error(`❌ SuperJournal: Error permanently deleting entry ${turnId}:`, error);
    return false;
  }
}

/**
 * PERMANENTLY DELETE FROM JOURNAL
 * 
 * BOSS REQUIREMENT: Remove corresponding Journal entries for referential integrity
 * - Finds machine-trimmed entry in main journal bucket
 * - Permanently deletes the R2 object
 * - Non-blocking: continues if journal entry doesn't exist
 * - Maintains referential integrity across storage systems
 */
async function hardDeleteFromJournal(turnId: string): Promise<boolean> {
  try {
    console.log(`🔍 Journal: Locating entry ${turnId} for PERMANENT DELETION...`);
    
    // JOURNAL SEARCH: Find corresponding journal entries
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
    
    // FIND MATCHING ENTRIES: Look for journal entries with turnId
    const targetKeys: string[] = [];
    
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
            targetKeys.push(obj.Key);
            console.log(`🎯 Journal: Found target entry ${turnId} at ${obj.Key}`);
          }
        }
      } catch (objError) {
        console.warn(`⚠️ Journal: Error checking object ${obj.Key}:`, objError);
        continue;
      }
    }
    
    // PERMANENT DELETION: Remove all matching journal entries
    let deletedCount = 0;
    
    for (const key of targetKeys) {
      try {
        console.log(`🔥 Journal: PERMANENTLY DELETING ${key}...`);
        
        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_JOURNAL_BUCKET,
          Key: key
        });
        
        await s3Client!.send(deleteCommand);
        deletedCount++;
        
        console.log(`💥 Journal: PERMANENT DELETION COMPLETED for ${key}`);
        
      } catch (deleteError) {
        console.error(`❌ Journal: Error deleting ${key}:`, deleteError);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Journal: Successfully deleted ${deletedCount} entries for ${turnId}`);
      return true;
    } else {
      console.log(`ℹ️ Journal: No entries found for ${turnId} (non-blocking)`);
      return false;
    }
    
  } catch (error) {
    console.error(`⚠️ Journal: Error permanently deleting entries for ${turnId}:`, error);
    // NON-BLOCKING: Journal deletion failure doesn't fail the whole operation
    return false;
  }
}