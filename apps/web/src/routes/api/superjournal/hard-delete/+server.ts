/**
 * SuperJournal Hard-Delete API - Permanent R2 Message Deletion
 * CLAUDE.md Compliant: Immediate permanent deletion with proper HTTP semantics
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { 
  VITE_R2_ACCESS_KEY_ID,
  VITE_R2_SECRET_ACCESS_KEY,
  VITE_R2_SUPERJOURNAL_BUCKET,
  VITE_R2_ENDPOINT
} from '$env/static/private';

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { turnId } = await request.json();
    
    if (!turnId) {
      return json({ 
        success: false, 
        error: 'turnId is required' 
      }, { status: 400 });
    }
    
    // Environment validation
    const accessKeyId = VITE_R2_ACCESS_KEY_ID || '';
    const secretAccessKey = VITE_R2_SECRET_ACCESS_KEY || '';
    const bucket = VITE_R2_SUPERJOURNAL_BUCKET || 'atomicaether-superjournal';
    const endpoint = VITE_R2_ENDPOINT || '';
    
    if (!accessKeyId || !secretAccessKey || !endpoint) {
      return json({ 
        success: false, 
        error: 'R2 credentials not configured' 
      }, { status: 500 });
    }
    
    // Create R2 client
    const s3 = new S3Client({
      endpoint,
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    // Find the R2 key for this turnId - check multiple possible date formats
    // Same 7-day search logic for consistency
    const now = new Date();
    const searchDates = [];
    
    // Check last 7 days to handle timezone edge cases and recent messages
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      searchDates.push(`entries/${year}/${month}/${day}/${turnId}.json`);
    }
    
    let foundKey: string | null = null;
    
    // Try to find the existing entry to delete
    for (const key of searchDates) {
      try {
        // Attempt to delete - if it exists, this will succeed
        await s3.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: key
        }));
        
        foundKey = key;
        console.log(`🗑️ Hard-deleted message from R2: ${key}`);
        break;
        
      } catch (error: any) {
        // If NoSuchKey, continue searching other dates
        if (error.name === 'NoSuchKey') {
          continue;
        }
        // Other errors should be thrown
        throw error;
      }
    }
    
    if (!foundKey) {
      return json({ 
        success: false, 
        error: `Message with turnId ${turnId} not found in SuperJournal` 
      }, { status: 404 });
    }
    
    return json({ 
      success: true,
      message: 'Message permanently deleted',
      turnId,
      key: foundKey,
      deletedAt: Date.now()
    });
    
  } catch (error) {
    console.error('SuperJournal hard-delete error:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};