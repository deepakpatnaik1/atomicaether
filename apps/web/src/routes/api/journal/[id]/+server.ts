import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * Journal Entry Retrieval Endpoint
 * Retrieves specific machine-trimmed entries by ID
 */

// Import R2 credentials from environment
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_JOURNAL_BUCKET = 'atomicaether-journal';

// Initialize S3 client for R2 (S3-compatible)
const s3Client = R2_ENDPOINT ? new S3Client({
  endpoint: R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || ''
  }
}) : null;

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const entryId = params.id;
    const conversationId = url.searchParams.get('conversationId');
    
    if (!entryId) {
      return json({ error: 'Entry ID required' }, { status: 400 });
    }
    
    if (!conversationId) {
      return json({ error: 'Conversation ID required' }, { status: 400 });
    }
    
    // Check if R2 is configured
    if (!s3Client || !R2_JOURNAL_BUCKET) {
      console.error('📰 Journal: R2 not configured');
      return json({ error: 'R2 storage not configured' }, { status: 500 });
    }
    
    // Try to find the entry by scanning the conversation
    // In practice, you'd need the timestamp or maintain an index
    // For now, we'll return an error suggesting the full conversation endpoint
    return json({ 
      error: 'Direct entry retrieval not implemented. Use /api/journal/conversation/[id] instead.',
      suggestion: `/api/journal/conversation/${conversationId}`
    }, { status: 501 });
    
  } catch (error) {
    console.error('📰 Journal: Retrieval error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};