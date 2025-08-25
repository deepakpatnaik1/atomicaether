import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * Journal List Endpoint
 * Lists conversations and provides summary statistics from the journal
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

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Check if R2 is configured
    if (!s3Client || !R2_JOURNAL_BUCKET) {
      console.error('📰 Journal: R2 not configured');
      return json({ error: 'R2 storage not configured' }, { status: 500 });
    }
    
    // Get global manifest first
    let globalManifest;
    try {
      const globalCommand = new GetObjectCommand({
        Bucket: R2_JOURNAL_BUCKET,
        Key: 'manifests/global.json'
      });
      const globalResponse = await s3Client.send(globalCommand);
      const globalBody = await globalResponse.Body?.transformToString();
      globalManifest = globalBody ? JSON.parse(globalBody) : null;
    } catch (err) {
      // Global manifest doesn't exist yet
      globalManifest = {
        totalMessages: 0,
        totalConversations: 0,
        priorityBreakdown: { high: 0, medium: 0, low: 0 },
        decisionCount: 0,
        inferableCount: 0,
        conversations: []
      };
    }
    
    // List all conversations
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_JOURNAL_BUCKET,
      Prefix: 'conversations/',
      Delimiter: '/', // This will give us the conversation IDs as common prefixes
      MaxKeys: 1000
    });
    
    const listResponse = await s3Client.send(listCommand);
    const conversations = [];
    
    if (listResponse.CommonPrefixes) {
      for (const prefix of listResponse.CommonPrefixes) {
        if (!prefix.Prefix) continue;
        
        // Extract conversation ID from prefix: "conversations/{id}/"
        const conversationId = prefix.Prefix.replace('conversations/', '').replace('/', '');
        
        // Get conversation metadata
        try {
          const metadataKey = `conversations/${conversationId}/metadata.json`;
          const metadataCommand = new GetObjectCommand({
            Bucket: R2_JOURNAL_BUCKET,
            Key: metadataKey
          });
          
          const metadataResponse = await s3Client.send(metadataCommand);
          const metadataBody = await metadataResponse.Body?.transformToString();
          
          if (metadataBody) {
            const metadata = JSON.parse(metadataBody);
            conversations.push({
              conversationId,
              ...metadata,
              lastMessageDate: metadata.lastMessage ? new Date(metadata.lastMessage).toISOString() : null,
              firstMessageDate: metadata.firstMessage ? new Date(metadata.firstMessage).toISOString() : null
            });
          }
        } catch (err) {
          console.warn(`📰 Journal: Failed to get metadata for conversation ${conversationId}:`, err);
          // Add basic info even if metadata fails
          conversations.push({
            conversationId,
            totalMessages: 0,
            priorityBreakdown: { high: 0, medium: 0, low: 0 },
            decisionCount: 0,
            inferableCount: 0,
            error: 'Metadata unavailable'
          });
        }
      }
    }
    
    // Sort conversations by last message timestamp (newest first)
    conversations.sort((a, b) => {
      const aTime = a.lastMessage || 0;
      const bTime = b.lastMessage || 0;
      return bTime - aTime;
    });
    
    console.log(`📰 Journal: Retrieved ${conversations.length} conversations from journal`);
    
    return json({
      global: globalManifest,
      conversations,
      totalConversations: conversations.length
    });
    
  } catch (error) {
    console.error('📰 Journal: List error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};