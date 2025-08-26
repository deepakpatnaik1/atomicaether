import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

/**
 * SuperJournal Manual Clean Endpoint
 * WARNING: This completely wipes the R2 bucket clean
 * Use only for development/testing purposes
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

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { confirmClean } = await request.json();
    
    // Safety check - require explicit confirmation
    if (confirmClean !== 'YES_DELETE_ALL_SUPERJOURNAL_DATA') {
      return json({
        success: false,
        error: 'Must provide confirmClean: "YES_DELETE_ALL_SUPERJOURNAL_DATA" to proceed',
        deleted: 0
      }, { status: 400 });
    }
    
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      return json({
        success: false,
        error: 'R2 storage not configured',
        deleted: 0
      }, { status: 500 });
    }
    
    console.log('🧹 SuperJournal: Starting manual bucket cleaning...');
    
    let totalDeleted = 0;
    let continuationToken: string | undefined;
    
    // List and delete all objects in batches
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: R2_SUPERJOURNAL_BUCKET,
        MaxKeys: 1000, // Process in batches of 1000
        ContinuationToken: continuationToken
      });
      
      const listed = await s3Client.send(listCommand);
      
      if (listed.Contents && listed.Contents.length > 0) {
        console.log(`🧹 SuperJournal: Found ${listed.Contents.length} objects to delete`);
        
        // Prepare batch delete
        const objectsToDelete = listed.Contents
          .filter(obj => obj.Key) // Only objects with keys
          .map(obj => ({ Key: obj.Key! }));
        
        if (objectsToDelete.length > 0) {
          // Delete in batches (S3 supports up to 1000 objects per batch)
          const batchSize = 1000;
          for (let i = 0; i < objectsToDelete.length; i += batchSize) {
            const batch = objectsToDelete.slice(i, i + batchSize);
            
            const deleteCommand = new DeleteObjectsCommand({
              Bucket: R2_SUPERJOURNAL_BUCKET,
              Delete: {
                Objects: batch,
                Quiet: true // Don't return info about each deleted object
              }
            });
            
            const deleteResult = await s3Client.send(deleteCommand);
            const deletedCount = batch.length - (deleteResult.Errors?.length || 0);
            totalDeleted += deletedCount;
            
            console.log(`🧹 SuperJournal: Deleted batch of ${deletedCount} objects`);
            
            // Log any errors
            if (deleteResult.Errors && deleteResult.Errors.length > 0) {
              console.error('🧹 SuperJournal: Some objects failed to delete:', deleteResult.Errors);
            }
          }
        }
      }
      
      continuationToken = listed.NextContinuationToken;
      
    } while (continuationToken);
    
    console.log(`🧹 SuperJournal: Manual cleaning complete. Deleted ${totalDeleted} objects total`);
    
    return json({
      success: true,
      message: 'SuperJournal bucket cleaned successfully',
      deleted: totalDeleted
    });
    
  } catch (error) {
    console.error('🧹 SuperJournal: Manual clean error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      deleted: 0
    }, { status: 500 });
  }
};

// Also support GET for checking bucket status
export const GET: RequestHandler = async () => {
  try {
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      return json({
        configured: false,
        objectCount: 0,
        bucketName: R2_SUPERJOURNAL_BUCKET || 'Not configured'
      });
    }
    
    // Count objects in bucket
    let objectCount = 0;
    let continuationToken: string | undefined;
    
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: R2_SUPERJOURNAL_BUCKET,
        MaxKeys: 1000,
        ContinuationToken: continuationToken
      });
      
      const listed = await s3Client.send(listCommand);
      objectCount += listed.KeyCount || 0;
      continuationToken = listed.NextContinuationToken;
      
    } while (continuationToken);
    
    return json({
      configured: true,
      objectCount,
      bucketName: R2_SUPERJOURNAL_BUCKET
    });
    
  } catch (error) {
    console.error('🧹 SuperJournal: Status check error:', error);
    
    return json({
      configured: false,
      objectCount: 0,
      bucketName: R2_SUPERJOURNAL_BUCKET || 'Not configured',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};