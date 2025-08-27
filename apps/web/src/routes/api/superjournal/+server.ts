/**
 * SuperJournal - Simple R2 Save API
 * CORS-compliant server-side endpoint for R2 message pair storage
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { 
  VITE_R2_ACCESS_KEY_ID,
  VITE_R2_SECRET_ACCESS_KEY,
  VITE_R2_SUPERJOURNAL_BUCKET,
  VITE_R2_ENDPOINT
} from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { userMessage, assistantMessage, turnId, timestamp } = await request.json();
    
    // Environment variables for server-side R2 access (SvelteKit pattern)
    const accessKeyId = VITE_R2_ACCESS_KEY_ID || '';
    const secretAccessKey = VITE_R2_SECRET_ACCESS_KEY || '';
    const bucket = VITE_R2_SUPERJOURNAL_BUCKET || 'atomicaether-superjournal';
    const endpoint = VITE_R2_ENDPOINT || '';
    
    // Create R2 client
    const s3 = new S3Client({
      endpoint,
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    // Create entry
    const entry = {
      id: turnId,
      userMessage,
      assistantMessage,
      timestamp,
      savedAt: Date.now()
    };

    // Date-organized key
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `entries/${year}/${month}/${day}/${turnId}.json`;

    // Save to R2
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(entry, null, 2),
      ContentType: 'application/json'
    }));

    return json({ 
      success: true, 
      key,
      timestamp: Date.now()
    });

  } catch (error) {
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};