import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Import R2 credentials from environment
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME;
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

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
    // Check if R2 is configured
    if (!s3Client || !R2_BUCKET_NAME) {
      return json(
        { error: 'Cloud storage not configured' },
        { status: 503 }
      );
    }
    
    const { key, contentType, contentLength } = await request.json();
    
    // Validate input
    if (!key || !contentType) {
      return json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate file size (30MB max for images)
    if (contentLength > 30 * 1024 * 1024) {
      return json(
        { error: 'File too large. Maximum 30MB' },
        { status: 400 }
      );
    }
    
    // Create presigned URL for direct upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      // Set cache headers for CDN
      CacheControl: 'public, max-age=86400', // 24 hours
      // Add metadata
      Metadata: {
        'uploaded-at': new Date().toISOString()
      }
    });
    
    // Generate presigned URL (expires in 5 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 300 
    });
    
    // Construct public URL for accessing the file
    const publicUrl = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${key}`
      : `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
    
    return json({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 300
    });
    
  } catch (error) {
    console.error('Presign error:', error);
    return json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
};