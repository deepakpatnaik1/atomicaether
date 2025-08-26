import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * RecycleBin Clear Endpoint
 * Clears localStorage data for RecycleBin to sync with empty SuperJournal
 */

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { confirmClear } = await request.json();
    
    // Safety check - require explicit confirmation
    if (confirmClear !== 'YES_CLEAR_RECYCLEBIN_DATA') {
      return json({
        success: false,
        error: 'Must provide confirmClear: "YES_CLEAR_RECYCLEBIN_DATA" to proceed'
      }, { status: 400 });
    }
    
    // This endpoint will instruct the client to clear localStorage
    // The actual clearing happens on the client side via JavaScript
    
    console.log('🧹 RecycleBin: Clear localStorage instruction sent');
    
    return json({
      success: true,
      message: 'RecycleBin clear instruction sent',
      action: 'clear_localStorage'
    });
    
  } catch (error) {
    console.error('🧹 RecycleBin: Clear error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  return json({
    message: 'Use DELETE method with confirmClear to clear RecycleBin localStorage',
    storageKeys: [
      'atomicaether:recycle-bin',
      'atomicaether:recycle-bin-pairsets'
    ]
  });
};