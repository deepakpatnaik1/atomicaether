import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { JournalManifest } from '$lib/bricks/SuperJournalBrick/core/types';

/**
 * SuperJournal Manifest Endpoint
 * Returns statistics about the deep memory
 */

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const R2 = platform?.env?.R2_SUPERJOURNAL;
    
    if (!R2) {
      // Local development - return empty manifest
      console.log('🧠 SuperJournal: Local mode - no manifest');
      
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
    const manifestObject = await R2.get(masterKey);
    
    if (!manifestObject) {
      // No manifest yet - deep memory is empty
      return json({
        totalEntries: 0,
        firstEntry: null,
        lastEntry: null,
        totalTokens: 0,
        checksum: ''
      } as JournalManifest);
    }
    
    const manifest = await manifestObject.json() as JournalManifest;
    
    return json(manifest);
    
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