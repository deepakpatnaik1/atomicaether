import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * Journal Conversation Retrieval Endpoint
 * Retrieves all machine-trimmed entries for a specific conversation
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
    const conversationId = params.id;
    
    if (!conversationId) {
      return json({ error: 'Conversation ID required' }, { status: 400 });
    }
    
    // Check if R2 is configured
    if (!s3Client || !R2_JOURNAL_BUCKET) {
      console.error('📰 Journal: R2 not configured');
      return json({ error: 'R2 storage not configured' }, { status: 500 });
    }
    
    // Get conversation metadata first
    const metadataKey = `conversations/${conversationId}/metadata.json`;
    let metadata;
    
    try {
      const metadataCommand = new GetObjectCommand({
        Bucket: R2_JOURNAL_BUCKET,
        Key: metadataKey
      });
      const metadataResponse = await s3Client.send(metadataCommand);
      const metadataBody = await metadataResponse.Body?.transformToString();
      metadata = metadataBody ? JSON.parse(metadataBody) : null;
    } catch (err) {
      return json({ 
        error: 'Conversation not found in journal',
        conversationId 
      }, { status: 404 });
    }
    
    // List all message files in the conversation
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_JOURNAL_BUCKET,
      Prefix: `conversations/${conversationId}/messages/`,
      MaxKeys: 1000 // Limit for safety
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return json({
        conversationId,
        metadata,
        messages: [],
        totalMessages: 0
      });
    }
    
    // Retrieve each message file
    const messages = [];
    
    for (const object of listResponse.Contents) {
      if (!object.Key || object.Key.endsWith('metadata.json')) continue;
      
      try {
        const getCommand = new GetObjectCommand({
          Bucket: R2_JOURNAL_BUCKET,
          Key: object.Key
        });
        
        const response = await s3Client.send(getCommand);
        const body = await response.Body?.transformToString();
        
        if (body) {
          const message = JSON.parse(body);
          messages.push(message);
        }
      } catch (err) {
        console.warn(`📰 Journal: Failed to retrieve message ${object.Key}:`, err);
        // Continue with other messages
      }
    }
    
    // Sort messages by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`📰 Journal: Retrieved ${messages.length} trimmed messages for conversation ${conversationId}`);
    
    return json({
      conversationId,
      metadata,
      messages,
      totalMessages: messages.length
    });
    
  } catch (error) {
    console.error('📰 Journal: Conversation retrieval error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};