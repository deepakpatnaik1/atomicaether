import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { JournalManifest } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Manifest Endpoint
 * Returns master manifest with statistics
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
      console.log('🧠 SuperJournal: R2 not configured for manifest');
      
      // Return empty manifest
      return json({
        totalEntries: 0,
        firstEntry: null,
        lastEntry: null,
        totalTokens: 0,
        checksum: ''
      } as JournalManifest);
    }
    
    // Get master manifest
    const masterKey = 'manifests/master.json';
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: R2_SUPERJOURNAL_BUCKET,
        Key: masterKey
      });
      
      const result = await s3Client.send(getCommand);
      const bodyString = await result.Body?.transformToString();
      
      if (bodyString) {
        const manifest = JSON.parse(bodyString) as JournalManifest;
        return json(manifest);
      }
    } catch (err) {
      // Manifest doesn't exist yet
      console.log('🧠 SuperJournal: No manifest found');
    }
    
    // Return empty manifest
    return json({
      totalEntries: 0,
      firstEntry: null,
      lastEntry: null,
      totalTokens: 0,
      checksum: ''
    } as JournalManifest);
    
  } catch (error) {
    console.error('🧠 SuperJournal: Manifest error:', error);
    
    return json({
      totalEntries: 0,
      firstEntry: null,
      lastEntry: null,
      totalTokens: 0,
      checksum: ''
    } as JournalManifest, { status: 500 });
  }
};