import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * SuperJournal Permanent Delete Endpoint
 * PERMANENTLY removes entries from R2 storage - NO RECOVERY POSSIBLE
 * Sends messages to the unfriendly void.
 */

// Import R2 credentials from environment
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_SUPERJOURNAL_BUCKET = import.meta.env.VITE_R2_SUPERJOURNAL_BUCKET;

// Initialize S3 client for R2
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
    const { turnId } = await request.json();
    
    if (!turnId) {
      return json({ error: 'turnId is required' }, { status: 400 });
    }
    
    console.log('💀 SuperJournal: PERMANENT DELETE requested for turn:', turnId);
    
    // Check if R2 is configured
    if (!s3Client || !R2_SUPERJOURNAL_BUCKET) {
      console.log('💀 SuperJournal: R2 not configured');
      return json({ error: 'Storage not configured' }, { status: 500 });
    }
    
    // List all objects to find ones containing this turnId
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      MaxKeys: 1000
    });
    
    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];
    
    let deletedFromFiles = 0;
    
    // Process each journal file
    for (const obj of objects) {
      if (!obj.Key || !obj.Key.endsWith('.md')) continue;
      
      try {
        // Get file content
        const getCommand = new GetObjectCommand({
          Bucket: R2_SUPERJOURNAL_BUCKET,
          Key: obj.Key
        });
        
        const response = await s3Client.send(getCommand);
        const content = await response.Body?.transformToString() || '';
        
        // Parse entries and remove the target turn
        const entries = content.split('\n---\n').filter(entry => entry.trim());
        const filteredEntries = entries.filter(entry => {
          const idMatch = entry.match(/^### (.+)$/m);
          return !idMatch || idMatch[1] !== turnId;
        });
        
        // If we removed an entry, write back
        if (filteredEntries.length < entries.length) {
          const newContent = filteredEntries.join('\n---\n') + (filteredEntries.length > 0 ? '\n' : '');
          
          const putCommand = new PutObjectCommand({
            Bucket: R2_SUPERJOURNAL_BUCKET,
            Key: obj.Key,
            Body: newContent,
            ContentType: 'text/markdown'
          });
          
          await s3Client.send(putCommand);
          deletedFromFiles++;
          console.log(`💀 SuperJournal: Permanently deleted ${turnId} from ${obj.Key}`);
        }
        
      } catch (fileError) {
        console.error(`💀 Error processing file ${obj.Key}:`, fileError);
      }
    }
    
    // Also add permanent deletion marker
    const deletionMarkerKey = `deleted/${turnId}.marker`;
    const markerCommand = new PutObjectCommand({
      Bucket: R2_SUPERJOURNAL_BUCKET,
      Key: deletionMarkerKey,
      Body: JSON.stringify({
        turnId,
        deletedAt: Date.now(),
        permanent: true,
        reason: 'hard-delete-user-action'
      }),
      ContentType: 'application/json'
    });
    
    await s3Client.send(markerCommand);
    
    if (deletedFromFiles === 0) {
      console.log(`💀 SuperJournal: Turn ${turnId} not found in any files`);
    } else {
      console.log(`💀 SuperJournal: Turn ${turnId} PERMANENTLY DELETED from ${deletedFromFiles} files`);
      console.log('💀 SuperJournal: NO RECOVERY POSSIBLE - message sent to the void');
    }
    
    return json({ 
      success: true, 
      turnId,
      deletedFromFiles,
      permanent: true,
      message: 'Turn permanently deleted from SuperJournal - sent to the void'
    });
    
  } catch (error) {
    console.error('💀 SuperJournal: Permanent deletion failed:', error);
    return json({ 
      error: 'Permanent deletion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};