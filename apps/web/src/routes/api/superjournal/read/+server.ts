import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { JournalEntry, ReadResponse } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Read Endpoint
 * Read-only access to deep memory
 * Cannot modify. Cannot delete. Only remember.
 */

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    // Parse query parameters
    const startTime = url.searchParams.get('startTime');
    const endTime = url.searchParams.get('endTime');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sessionId = url.searchParams.get('sessionId');
    
    // Get R2 bucket
    const R2 = platform?.env?.R2_SUPERJOURNAL;
    
    if (!R2) {
      // Local development - return empty for now
      console.log('🧠 SuperJournal: Local mode - no R2 access');
      
      return json({
        entries: [],
        total: 0,
        hasMore: false
      } as ReadResponse);
    }
    
    // List objects based on time range
    let entries: JournalEntry[] = [];
    
    if (startTime && endTime) {
      // Time-based query
      entries = await readTimeRange(R2, parseInt(startTime), parseInt(endTime), limit, offset);
    } else {
      // Get recent entries
      entries = await readRecent(R2, limit, offset);
    }
    
    // Filter by session if specified
    if (sessionId) {
      entries = entries.filter(e => e.metadata.sessionId === sessionId);
    }
    
    return json({
      entries: entries,
      total: entries.length,
      hasMore: entries.length === limit
    } as ReadResponse);
    
  } catch (error) {
    console.error('🧠 SuperJournal: Read error:', error);
    
    return json({
      entries: [],
      total: 0,
      hasMore: false
    } as ReadResponse & { error: string }, { status: 500 });
  }
};

/**
 * Read entries within a time range
 */
async function readTimeRange(
  R2: any,
  startTime: number,
  endTime: number,
  limit: number,
  offset: number
): Promise<JournalEntry[]> {
  const entries: JournalEntry[] = [];
  
  // Generate date range to scan
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const prefix = `entries/${year}/${month}/${day}/`;
    
    // List objects for this day
    const listed = await R2.list({ prefix, limit: 1000 });
    
    for (const object of listed.objects) {
      const entry = await object.json() as JournalEntry;
      
      // Check if within time range
      if (entry.timestamp >= startTime && entry.timestamp <= endTime) {
        entries.push(entry);
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Sort by timestamp (newest first)
  entries.sort((a, b) => b.timestamp - a.timestamp);
  
  // Apply pagination
  return entries.slice(offset, offset + limit);
}

/**
 * Read recent entries
 */
async function readRecent(R2: any, limit: number, offset: number): Promise<JournalEntry[]> {
  const entries: JournalEntry[] = [];
  
  // Start from today and work backwards
  const today = new Date();
  let daysScanned = 0;
  const maxDays = 30;  // Scan up to 30 days back
  
  while (entries.length < (offset + limit) && daysScanned < maxDays) {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `entries/${year}/${month}/${day}/`;
    
    // List objects for this day
    const listed = await R2.list({ prefix, limit: 1000 });
    
    for (const object of listed.objects) {
      const entry = await object.json() as JournalEntry;
      entries.push(entry);
      
      if (entries.length >= (offset + limit)) {
        break;
      }
    }
    
    // Move to previous day
    today.setDate(today.getDate() - 1);
    daysScanned++;
  }
  
  // Sort by timestamp (newest first)
  entries.sort((a, b) => b.timestamp - a.timestamp);
  
  // Apply pagination
  return entries.slice(offset, offset + limit);
}