import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import type { JournalEntry, WriteResponse } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Write Endpoint
 * Append-only writes to Cloudflare R2
 * Immutable. Forever.
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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const entry: JournalEntry = await request.json();
    
    // Validate entry
    if (!entry.id || !entry.bossMessage || !entry.samaraMessage) {
      return json({
        success: false,
        error: 'Invalid journal entry',
        entryId: '',
        timestamp: 0,
        r2Key: ''
      } as WriteResponse, { status: 400 });
    }
    
    // Check if R2 is configured
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      console.log('🧠 SuperJournal: R2 not configured, simulating write');
      return json({
        success: true,
        entryId: entry.id,
        timestamp: entry.timestamp,
        r2Key: 'simulated'
      } as WriteResponse);
    }
    
    // Compute SHA-256 checksum for immutability verification
    const contentToHash = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      turnNumber: entry.turnNumber,
      bossMessage: entry.bossMessage,
      samaraMessage: entry.samaraMessage
    });
    entry.checksum = createHash('sha256').update(contentToHash).digest('hex');
    
    // Generate R2 key with date-based structure for organization
    const date = new Date(entry.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const r2Key = `entries/${year}/${month}/${day}/${entry.id}-${entry.timestamp}.json`;
    
    // Write to R2
    const putCommand = new PutObjectCommand({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      Key: r2Key,
      Body: JSON.stringify(entry, null, 2),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        checksum: entry.checksum,
        turnNumber: String(entry.turnNumber),
        sessionId: entry.metadata.sessionId
      }
    });
    
    await s3Client.send(putCommand);
    
    // Update daily manifest
    await updateManifest(s3Client, R2_SUPERJOURNAL_BUCKET, date, entry);
    
    console.log('🧠 SuperJournal: Written to R2:', r2Key);
    
    return json({
      success: true,
      entryId: entry.id,
      timestamp: entry.timestamp,
      r2Key: r2Key
    } as WriteResponse);
    
  } catch (error) {
    console.error('🧠 SuperJournal: Write error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      entryId: '',
      timestamp: 0,
      r2Key: ''
    } as WriteResponse, { status: 500 });
  }
};

/**
 * Update daily and master manifests
 */
async function updateManifest(s3Client: S3Client, bucket: string, date: Date, entry: JournalEntry): Promise<void> {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dailyKey = `manifests/daily/${year}-${month}-${day}.json`;
    
    // For now, just update the master manifest
    // Daily manifests can be implemented later for optimization
    await updateMasterManifest(s3Client, bucket, entry);
    
  } catch (error) {
    console.error('🧠 SuperJournal: Manifest update error:', error);
    // Don't fail the write if manifest update fails
  }
}

async function updateMasterManifest(s3Client: S3Client, bucket: string, entry: JournalEntry): Promise<void> {
  const masterKey = 'manifests/master.json';
  
  // For simplicity in dev, we'll skip manifest updates for now
  // In production, this would fetch, update, and write back the manifest
  console.log('🧠 SuperJournal: Manifest update skipped in dev');
}