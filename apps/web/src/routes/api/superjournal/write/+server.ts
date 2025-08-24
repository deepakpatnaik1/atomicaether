import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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
      console.error('🧠 SuperJournal: R2 not configured');
      return json({
        success: false,
        error: 'R2 storage not configured',
        entryId: entry.id,
        timestamp: entry.timestamp,
        r2Key: ''
      } as WriteResponse, { status: 500 });
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
    
    // Write to R2 (immutable object)
    const putCommand = new PutObjectCommand({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      Key: r2Key,
      Body: JSON.stringify(entry, null, 2),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=31536000, immutable',  // Cache forever - it never changes
      Metadata: {
        checksum: entry.checksum,
        turnNumber: String(entry.turnNumber),
        sessionId: entry.metadata.sessionId || ''
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
 * Manifests provide quick access to statistics without scanning all entries
 */
async function updateManifest(
  s3Client: S3Client, 
  bucket: string, 
  date: Date, 
  entry: JournalEntry
): Promise<void> {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dailyKey = `manifests/daily/${year}-${month}-${day}.json`;
    
    // Get or create daily manifest
    let dailyManifest;
    try {
      const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: dailyKey
      });
      const existing = await s3Client.send(getCommand);
      const bodyString = await existing.Body?.transformToString();
      dailyManifest = bodyString ? JSON.parse(bodyString) : null;
    } catch (err) {
      // Manifest doesn't exist yet
      dailyManifest = null;
    }
    
    if (!dailyManifest) {
      dailyManifest = {
        date: `${year}-${month}-${day}`,
        entries: [],
        totalTokens: 0
      };
    }
    
    // Add entry reference to daily manifest
    dailyManifest.entries.push({
      id: entry.id,
      timestamp: entry.timestamp,
      turnNumber: entry.turnNumber
    });
    
    // Estimate tokens (rough calculation)
    const estimatedTokens = Math.ceil((entry.bossMessage.length + entry.samaraMessage.length) / 4);
    dailyManifest.totalTokens += estimatedTokens;
    
    // Write updated daily manifest
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: dailyKey,
      Body: JSON.stringify(dailyManifest, null, 2),
      ContentType: 'application/json'
    });
    await s3Client.send(putCommand);
    
    // Update master manifest
    await updateMasterManifest(s3Client, bucket, entry, estimatedTokens);
    
  } catch (error) {
    console.error('🧠 SuperJournal: Manifest update error:', error);
    // Don't fail the write if manifest update fails
  }
}

async function updateMasterManifest(
  s3Client: S3Client, 
  bucket: string, 
  entry: JournalEntry, 
  tokens: number
): Promise<void> {
  const masterKey = 'manifests/master.json';
  
  let master;
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: masterKey
    });
    const existing = await s3Client.send(getCommand);
    const bodyString = await existing.Body?.transformToString();
    master = bodyString ? JSON.parse(bodyString) : null;
  } catch (err) {
    // Master manifest doesn't exist yet
    master = null;
  }
  
  if (!master) {
    master = {
      totalEntries: 0,
      firstEntry: null,
      lastEntry: null,
      totalTokens: 0
    };
  }
  
  // Update master statistics
  master.totalEntries++;
  master.totalTokens += tokens;
  
  if (!master.firstEntry) {
    master.firstEntry = entry.timestamp;
  }
  master.lastEntry = entry.timestamp;
  
  // Compute master checksum
  master.checksum = createHash('sha256')
    .update(JSON.stringify(master))
    .digest('hex');
  
  // Write updated master manifest
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: masterKey,
    Body: JSON.stringify(master, null, 2),
    ContentType: 'application/json'
  });
  await s3Client.send(putCommand);
}