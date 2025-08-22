# File Upload Feature Documentation

## Overview
The file upload feature enables users to attach images to their messages for vision-capable LLM models. The system uses a modern URL-based approach with cloud storage (Cloudflare R2) and automatic fallback to base64 encoding for local development.

## Architecture

### Upload Flow
1. User selects files via UI → Files uploaded to cloud storage → URLs stored
2. Message sent with file URLs → API formats for specific LLM provider
3. LLM fetches images directly from URLs (optimal performance)

### Key Components

#### FileUploadService (`lib/services/FileUploadService.ts`)
- Handles file uploads to Cloudflare R2 or base64 fallback
- Validates file size and type (images only)
- Provides upload progress callbacks
- Includes retry logic (3 attempts with 1s delay)
- Limits: 30MB for R2, 5MB for base64 fallback

#### InputBarUI (`lib/bricks/InputBarUI/`)
- File selection and drag-and-drop support
- Upload progress indicators
- File preview with remove option
- Publishes `input:submit` event with fileUrls array

#### LLMBrick (`lib/bricks/LLMBrick/`)
- Receives fileUrls from input:submit event
- Passes URLs to API endpoint
- Supports vision-capable models

#### API Endpoint (`routes/api/llm/+server.ts`)
- Formats messages with images for each provider:
  - **Anthropic**: Supports both URL and base64 formats
  - **OpenAI**: Uses image_url format
  - **Fireworks**: Text-only (no image support)

## Configuration

### Environment Variables
```env
# Cloudflare R2 Configuration
VITE_R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
VITE_R2_ACCESS_KEY_ID=your_access_key
VITE_R2_SECRET_ACCESS_KEY=your_secret_key
VITE_R2_BUCKET_NAME=your-bucket-name
VITE_R2_PUBLIC_URL=https://your-public-url.com
```

If R2 is not configured, the system automatically falls back to base64 encoding.

### Supported File Types
- JPEG (`image/jpeg`)
- PNG (`image/png`)
- GIF (`image/gif`)
- WebP (`image/webp`)

### File Size Limits
- **With R2**: 30MB per file
- **Base64 fallback**: 5MB per file
- **Multiple files**: Up to 10 images per message

## Event Structure

### input:submit Event
```typescript
{
  text: string,
  fileUrls: string[],        // Array of uploaded file URLs
  files: Array<{              // Metadata only
    name: string,
    type: string,
    size: number
  }>,
  model: string,
  persona: string,
  timestamp: number
}
```

## API Message Formatting

### Anthropic Format
```json
{
  "content": [
    { "type": "text", "text": "Describe this image" },
    { "type": "image", "source": {
      "type": "url",
      "url": "https://storage.example.com/image.jpg"
    }}
  ]
}
```

### OpenAI Format
```json
{
  "content": [
    { "type": "text", "text": "Describe this image" },
    { "type": "image_url", "image_url": {
      "url": "https://storage.example.com/image.jpg"
    }}
  ]
}
```

## Error Handling

### Upload Failures
- **Retry Logic**: 3 attempts with 1-second delays
- **Fallback**: Automatic fallback to base64 if R2 fails
- **User Feedback**: Error events published to error:show

### Validation Errors
- File too large → Clear error message with size limit
- Invalid file type → Lists allowed types
- Upload timeout → Retries automatically

## Performance Benefits

### URL-based Approach
- ✅ 33% smaller payloads (no base64 bloat)
- ✅ CDN optimization (automatic compression)
- ✅ Faster uploads (parallel processing)
- ✅ No token limit issues (URLs are tiny)
- ✅ Better caching (CDN handles it)

### Base64 Fallback
- ⚠️ Larger payloads (33% overhead)
- ⚠️ Slower processing
- ⚠️ Limited to 5MB files
- ✅ Works without cloud storage
- ✅ Good for local development

## Testing

### Local Development (Base64)
1. Don't configure R2 environment variables
2. System automatically uses base64 encoding
3. Console shows: "📁 R2 not configured. Using base64 fallback"

### Production (R2)
1. Configure R2 environment variables
2. Set up CORS on R2 bucket for browser uploads
3. Console shows: "☁️ R2 configured. Using cloud storage"

### Test Scenarios
- Single image upload
- Multiple images (up to 10)
- Large files (test limits)
- Upload failures (network issues)
- Mixed text and images
- Different image formats

## Security Considerations

1. **Presigned URLs**: Expire after 5 minutes
2. **File Validation**: Type and size checks
3. **CORS Configuration**: Restrict to your domain
4. **No Direct API Keys**: Server-side handling only
5. **Temporary Storage**: Files can expire after 24 hours

## Future Enhancements

- [ ] Support for more file types (PDFs, documents)
- [ ] Image compression before upload
- [ ] Thumbnail generation
- [ ] Persistent storage option
- [ ] Image editing tools
- [ ] Batch upload optimization

## Troubleshooting

### R2 Not Working
- Check environment variables are set
- Verify R2 bucket exists and is configured
- Check CORS settings on bucket
- Verify API keys have upload permissions

### Base64 Fallback Issues
- Check file size (max 5MB)
- Verify browser supports FileReader API
- Check console for specific error messages

### Upload Progress Not Showing
- Verify XMLHttpRequest is used (not fetch)
- Check progress event listeners
- Console log progress callbacks

## Architecture Compliance

This feature follows AtomicAether's core principles:

1. **Webby**: Uses native Web APIs (FileReader, XMLHttpRequest)
2. **Four Buses**: Events flow through EventBus
3. **Thin Wrappers**: Minimal abstraction over upload APIs
4. **LEGO Bricks**: FileUploadService is independent
5. **Easy Removal**: Delete service file and remove imports
6. **Don't Reinvent**: Uses standard upload patterns