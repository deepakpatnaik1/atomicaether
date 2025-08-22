/**
 * FileUploadService
 * Handles file uploads to Cloudflare R2 or falls back to base64
 */

export class FileUploadService {
  private useCloudStorage: boolean;
  private r2Endpoint?: string;
  private r2BucketName?: string;
  
  constructor() {
    // Check if R2 credentials are available
    this.r2Endpoint = import.meta.env.VITE_R2_ENDPOINT;
    this.r2BucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    this.useCloudStorage = !!(this.r2Endpoint && this.r2BucketName);
    
    if (!this.useCloudStorage) {
      console.warn('📁 R2 not configured. Using base64 fallback for file uploads.');
    } else {
      console.log('☁️ R2 configured. Using cloud storage for file uploads.');
    }
  }
  
  /**
   * Upload a file and return its URL
   */
  async uploadFile(
    file: File, 
    onProgress?: (percent: number) => void
  ): Promise<string> {
    // Validate file
    this.validateFile(file);
    
    if (this.useCloudStorage) {
      return this.uploadToR2(file, onProgress);
    } else {
      return this.convertToBase64(file, onProgress);
    }
  }
  
  /**
   * Upload multiple files in parallel
   */
  async uploadFiles(
    files: File[],
    onProgress?: (fileIndex: number, percent: number) => void
  ): Promise<string[]> {
    return Promise.all(
      files.map((file, index) => 
        this.uploadFile(file, (percent) => onProgress?.(index, percent))
      )
    );
  }
  
  /**
   * Validate file size and type
   */
  private validateFile(file: File): void {
    const MAX_SIZE = this.useCloudStorage ? 30 * 1024 * 1024 : 5 * 1024 * 1024; // 30MB for R2, 5MB for base64
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > MAX_SIZE) {
      throw new Error(`File too large. Maximum size: ${MAX_SIZE / 1024 / 1024}MB`);
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }
  }
  
  /**
   * Upload to Cloudflare R2 with retry logic
   */
  private async uploadToR2(
    file: File,
    onProgress?: (percent: number) => void,
    retryCount = 0
  ): Promise<string> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const extension = file.name.split('.').pop();
      const key = `uploads/${timestamp}-${randomId}.${extension}`;
      
      // Get presigned URL from our API
      const presignResponse = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key,
          contentType: file.type,
          contentLength: file.size
        })
      });
      
      if (!presignResponse.ok) {
        throw new Error('Failed to get upload URL');
      }
      
      const { uploadUrl, publicUrl } = await presignResponse.json();
      
      // Upload directly to R2
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            resolve(publicUrl);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
        
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
      
    } catch (error) {
      console.error(`R2 upload attempt ${retryCount + 1} failed:`, error);
      
      // Retry if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`Retrying upload in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.uploadToR2(file, onProgress, retryCount + 1);
      }
      
      // Final fallback to base64 if all retries fail
      console.warn('All R2 upload attempts failed, falling back to base64');
      return this.convertToBase64(file, onProgress);
    }
  }
  
  /**
   * Convert file to base64 data URL (fallback)
   */
  private async convertToBase64(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });
      
      reader.addEventListener('load', () => {
        const result = reader.result as string;
        resolve(result);
      });
      
      reader.addEventListener('error', () => {
        reject(new Error('Failed to read file'));
      });
      
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Check if a URL is a base64 data URL
   */
  isBase64Url(url: string): boolean {
    return url.startsWith('data:');
  }
  
  /**
   * Extract mime type from base64 data URL
   */
  getMimeType(url: string): string {
    if (this.isBase64Url(url)) {
      const matches = url.match(/^data:([^;]+);/);
      return matches ? matches[1] : 'image/jpeg';
    }
    // For regular URLs, guess from extension
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mimeTypes[extension || ''] || 'image/jpeg';
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();