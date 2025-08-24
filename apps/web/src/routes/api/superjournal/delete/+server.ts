import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * SuperJournal Delete Endpoint
 * Since SuperJournal is immutable, we implement soft delete by:
 * 1. Adding a deletion marker file
 * 2. Updating manifests to exclude deleted entries
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
    
    // Create a deletion marker
    const deletionKey = `deletions/${turnId}.json`;
    const deletionMarker = {
      turnId,
      deletedAt: Date.now(),
      reason: 'User requested deletion'
    };
    
    const putCommand = new PutObjectCommand({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      Key: deletionKey,
      Body: JSON.stringify(deletionMarker, null, 2),
      ContentType: 'application/json',
      Metadata: {
        turnId,
        deletedAt: String(Date.now())
      }
    });
    
    await s3Client.send(putCommand);
    
    console.log('🧠 SuperJournal: Created deletion marker for:', turnId);
    
    // Also update the deletions manifest for quick lookup
    await updateDeletionsManifest(s3Client, R2_SUPERJOURNAL_BUCKET, turnId);
    
    return json({
      success: true,
      turnId,
      message: 'Entry marked as deleted'
    });
    
  } catch (error) {
    console.error('🧠 SuperJournal: Delete error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

async function updateDeletionsManifest(
  s3Client: S3Client,
  bucket: string,
  turnId: string
): Promise<void> {
  const manifestKey = 'manifests/deletions.json';
  
  let manifest;
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: manifestKey
    });
    const existing = await s3Client.send(getCommand);
    const bodyString = await existing.Body?.transformToString();
    manifest = bodyString ? JSON.parse(bodyString) : null;
  } catch (err) {
    // Manifest doesn't exist yet
    manifest = null;
  }
  
  if (!manifest) {
    manifest = {
      deletedTurns: [],
      lastUpdated: Date.now()
    };
  }
  
  // Add to deleted turns if not already there
  if (!manifest.deletedTurns.includes(turnId)) {
    manifest.deletedTurns.push(turnId);
    manifest.lastUpdated = Date.now();
    
    // Write updated manifest
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: manifestKey,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: 'application/json'
    });
    await s3Client.send(putCommand);
  }
}