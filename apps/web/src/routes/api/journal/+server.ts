import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

/**
 * Journal API Endpoint
 * Stores machine-trimmed conversation data to atomicaether-journal R2 bucket
 */

// Journal entry type for machine-trimmed data
interface JournalTrimEntry {
  id: string;
  conversationId: string;
  timestamp: number;
  turnNumber: number;
  trim: string; // "Boss: [message]\nSamara: [response]" format
  metadata: {
    hasDecisions: boolean;
    isInferable: boolean;
    priority: 'high' | 'medium' | 'low';
  };
  checksum?: string;
}

interface JournalWriteResponse {
  success: boolean;
  entryId: string;
  timestamp: number;
  r2Key: string;
  error?: string;
}

// Import R2 credentials from environment
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_JOURNAL_BUCKET = 'atomicaether-journal'; // New dedicated bucket

// Initialize S3 client for R2 (S3-compatible)
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
    const entry: JournalTrimEntry = await request.json();
    
    // Validate entry
    if (!entry.id || !entry.trim || !entry.metadata) {
      return json({
        success: false,
        error: 'Invalid journal trim entry',
        entryId: '',
        timestamp: 0,
        r2Key: ''
      } as JournalWriteResponse, { status: 400 });
    }
    
    // Check if R2 is configured
    if (!s3Client || !R2_JOURNAL_BUCKET) {
      console.error('📰 Journal: R2 not configured');
      return json({
        success: false,
        error: 'R2 storage not configured',
        entryId: entry.id,
        timestamp: entry.timestamp,
        r2Key: ''
      } as JournalWriteResponse, { status: 500 });
    }
    
    // Compute SHA-256 checksum for immutability verification
    const contentToHash = JSON.stringify({
      id: entry.id,
      conversationId: entry.conversationId,
      timestamp: entry.timestamp,
      turnNumber: entry.turnNumber,
      trim: entry.trim,
      metadata: entry.metadata
    });
    entry.checksum = createHash('sha256').update(contentToHash).digest('hex');
    
    // Generate R2 key with conversation-based structure
    const date = new Date(entry.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const r2Key = `conversations/${entry.conversationId}/messages/${entry.id}-${entry.timestamp}.json`;
    
    // Write to Journal R2 bucket
    const putCommand = new PutObjectCommand({
      Bucket: R2_JOURNAL_BUCKET,
      Key: r2Key,
      Body: JSON.stringify(entry, null, 2),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        checksum: entry.checksum,
        turnNumber: String(entry.turnNumber),
        conversationId: entry.conversationId,
        priority: entry.metadata.priority,
        hasDecisions: String(entry.metadata.hasDecisions),
        isInferable: String(entry.metadata.isInferable)
      }
    });
    
    await s3Client.send(putCommand);
    
    // Update conversation manifest
    await updateConversationManifest(s3Client, R2_JOURNAL_BUCKET, entry);
    
    console.log('📰 Journal: Written trim data to R2:', r2Key);
    
    return json({
      success: true,
      entryId: entry.id,
      timestamp: entry.timestamp,
      r2Key: r2Key
    } as JournalWriteResponse);
    
  } catch (error) {
    console.error('📰 Journal: Write error:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      entryId: '',
      timestamp: 0,
      r2Key: ''
    } as JournalWriteResponse, { status: 500 });
  }
};

/**
 * Update conversation manifest for quick access and statistics
 */
async function updateConversationManifest(
  s3Client: S3Client, 
  bucket: string, 
  entry: JournalTrimEntry
): Promise<void> {
  try {
    const manifestKey = `conversations/${entry.conversationId}/metadata.json`;
    
    // Get or create conversation manifest
    let manifest;
    try {
      const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: manifestKey
      });
      const existing = await s3Client.send(getCommand);
      const bodyString = await existing.Body?.transformToString();
      manifest = bodyString ? JSON.parse(bodyString) : null;
    } catch (err) {
      // Manifest doesn't exist yet
      manifest = null;
    }
    
    if (!manifest) {
      manifest = {
        conversationId: entry.conversationId,
        messages: [],
        totalMessages: 0,
        priorityBreakdown: { high: 0, medium: 0, low: 0 },
        decisionCount: 0,
        inferableCount: 0,
        firstMessage: null,
        lastMessage: null
      };
    }
    
    // Add message reference to manifest
    manifest.messages.push({
      id: entry.id,
      timestamp: entry.timestamp,
      turnNumber: entry.turnNumber,
      priority: entry.metadata.priority,
      hasDecisions: entry.metadata.hasDecisions,
      isInferable: entry.metadata.isInferable
    });
    
    // Update statistics
    manifest.totalMessages++;
    manifest.priorityBreakdown[entry.metadata.priority]++;
    
    if (entry.metadata.hasDecisions) {
      manifest.decisionCount++;
    }
    
    if (entry.metadata.isInferable) {
      manifest.inferableCount++;
    }
    
    if (!manifest.firstMessage) {
      manifest.firstMessage = entry.timestamp;
    }
    manifest.lastMessage = entry.timestamp;
    
    // Write updated conversation manifest
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: manifestKey,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: 'application/json'
    });
    await s3Client.send(putCommand);
    
    // Update global journal manifest
    await updateGlobalManifest(s3Client, bucket, entry);
    
  } catch (error) {
    console.error('📰 Journal: Conversation manifest update error:', error);
    // Don't fail the write if manifest update fails
  }
}

async function updateGlobalManifest(
  s3Client: S3Client, 
  bucket: string, 
  entry: JournalTrimEntry
): Promise<void> {
  const globalKey = 'manifests/global.json';
  
  let global;
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: globalKey
    });
    const existing = await s3Client.send(getCommand);
    const bodyString = await existing.Body?.transformToString();
    global = bodyString ? JSON.parse(bodyString) : null;
  } catch (err) {
    // Global manifest doesn't exist yet
    global = null;
  }
  
  if (!global) {
    global = {
      totalMessages: 0,
      totalConversations: 0,
      priorityBreakdown: { high: 0, medium: 0, low: 0 },
      decisionCount: 0,
      inferableCount: 0,
      firstMessage: null,
      lastMessage: null,
      conversations: new Set()
    };
  }
  
  // Track unique conversations
  const conversationSet = new Set(global.conversations || []);
  const isNewConversation = !conversationSet.has(entry.conversationId);
  
  if (isNewConversation) {
    global.totalConversations++;
    conversationSet.add(entry.conversationId);
  }
  
  // Update global statistics
  global.totalMessages++;
  global.priorityBreakdown[entry.metadata.priority]++;
  global.conversations = Array.from(conversationSet);
  
  if (entry.metadata.hasDecisions) {
    global.decisionCount++;
  }
  
  if (entry.metadata.isInferable) {
    global.inferableCount++;
  }
  
  if (!global.firstMessage) {
    global.firstMessage = entry.timestamp;
  }
  global.lastMessage = entry.timestamp;
  
  // Write updated global manifest
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: globalKey,
    Body: JSON.stringify(global, null, 2),
    ContentType: 'application/json'
  });
  await s3Client.send(putCommand);
}