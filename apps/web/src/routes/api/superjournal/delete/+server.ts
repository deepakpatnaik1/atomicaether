/**
 * SuperJournal Soft-Delete API - R2 Status Update Endpoint
 * CLAUDE.md Compliant: Thin wrapper for R2 JSON patching operations
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { 
  VITE_R2_ACCESS_KEY_ID,
  VITE_R2_SECRET_ACCESS_KEY,
  VITE_R2_SUPERJOURNAL_BUCKET,
  VITE_R2_ENDPOINT
} from '$env/static/private';

export const PATCH: RequestHandler = async ({ request }) => {
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
    // Since we don't know the exact date, we'll need to search recent entries
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
    let existingData: any = null;
    
    // Try to find the existing entry
    for (const key of searchDates) {
      try {
        const getResponse = await s3.send(new GetObjectCommand({
          Bucket: bucket,
          Key: key
        }));
        
        if (getResponse.Body) {
          foundKey = key;
          const content = await getResponse.Body.transformToString();
          existingData = JSON.parse(content);
          break;
        }
      } catch (error) {
        // Entry not found for this date, continue searching
        continue;
      }
    }
    
    if (!foundKey || !existingData) {
      return json({ 
        success: false, 
        error: `Message with turnId ${turnId} not found in SuperJournal` 
      }, { status: 404 });
    }
    
    // Update the entry with soft-delete status
    const updatedData = {
      ...existingData,
      status: 'deleted',
      deletedAt: Date.now()
    };
    
    // Save updated entry back to R2
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: foundKey,
      Body: JSON.stringify(updatedData, null, 2),
      ContentType: 'application/json'
    }));
    
    return json({ 
      success: true,
      message: 'Message soft-deleted successfully',
      turnId,
      key: foundKey,
      deletedAt: updatedData.deletedAt
    });
    
  } catch (error) {
    console.error('SuperJournal soft-delete error:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};