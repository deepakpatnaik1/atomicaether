import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { createHash } from 'crypto';
import type { JournalEntry, WriteResponse } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Write Endpoint
 * Append-only writes to Cloudflare R2
 * Immutable. Forever.
 */

export const POST: RequestHandler = async ({ request, platform }) => {
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
    
    // Get R2 bucket from platform bindings
    const R2 = platform?.env?.R2_SUPERJOURNAL;
    
    if (!R2) {
      // Fallback for local development - simulate R2 write
      console.log('🧠 SuperJournal: Local mode - simulating R2 write:', r2Key);
      
      // In production, this would fail if R2 isn't configured
      if (process.env.NODE_ENV === 'production') {
        return json({
          success: false,
          error: 'R2 storage not configured',
          entryId: entry.id,
          timestamp: entry.timestamp,
          r2Key: ''
        } as WriteResponse, { status: 500 });
      }
      
      // Local development success
      return json({
        success: true,
        entryId: entry.id,
        timestamp: entry.timestamp,
        r2Key: r2Key
      } as WriteResponse);
    }
    
    // Write to R2 (immutable object)
    await R2.put(r2Key, JSON.stringify(entry, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=31536000, immutable'  // Cache forever - it never changes
      },
      customMetadata: {
        checksum: entry.checksum,
        turnNumber: String(entry.turnNumber),
        sessionId: entry.metadata.sessionId
      }
    });
    
    // Update daily manifest
    await updateManifest(R2, date, entry);
    
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
async function updateManifest(R2: any, date: Date, entry: JournalEntry): Promise<void> {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dailyKey = `manifests/daily/${year}-${month}-${day}.json`;
    
    // Get or create daily manifest
    let dailyManifest;
    const existing = await R2.get(dailyKey);
    
    if (existing) {
      dailyManifest = await existing.json();
    } else {
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
    await R2.put(dailyKey, JSON.stringify(dailyManifest, null, 2), {
      httpMetadata: {
        contentType: 'application/json'
      }
    });
    
    // Update master manifest
    await updateMasterManifest(R2, entry, estimatedTokens);
    
  } catch (error) {
    console.error('🧠 SuperJournal: Manifest update error:', error);
    // Don't fail the write if manifest update fails
  }
}

async function updateMasterManifest(R2: any, entry: JournalEntry, tokens: number): Promise<void> {
  const masterKey = 'manifests/master.json';
  
  let master;
  const existing = await R2.get(masterKey);
  
  if (existing) {
    master = await existing.json();
  } else {
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
  await R2.put(masterKey, JSON.stringify(master, null, 2), {
    httpMetadata: {
      contentType: 'application/json'
    }
  });
}