import type { InputBarBehavior, BTTConfig } from './types.js';

export class InputBarService {
  private behavior: InputBarBehavior | null = null;
  private bttConfig: BTTConfig | null = null;

  constructor(behavior: InputBarBehavior | null, bttConfig: BTTConfig | null) {
    this.behavior = behavior;
    this.bttConfig = bttConfig;
  }

  // Auto-resize calculation
  calculateTextAreaHeight(textarea: HTMLTextAreaElement): string {
    if (!this.behavior) return '20px';
    
    const { lineHeight, minHeight, maxHeight } = this.behavior.autoResize;
    
    // Temporarily reset height to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    return `${newHeight}px`;
  }

  // File preview URL generation
  getFilePreviewUrl(file: File): string {
    if (!this.behavior) return '';
    
    if (file.type.startsWith('image/') && this.behavior.fileHandling.filePreview.imagePreviewEnabled) {
      return URL.createObjectURL(file);
    }
    return '';
  }

  // Escape key handling
  shouldClearOnEscape(type: 'files' | 'text' | 'height'): boolean {
    if (!this.behavior) return true;
    
    const escapeConfig = this.behavior.keyboardShortcuts.escapeKey;
    switch (type) {
      case 'files': return escapeConfig.clearFiles;
      case 'text': return escapeConfig.clearText;
      case 'height': return escapeConfig.resetHeight;
      default: return false;
    }
  }

  // BTT mock canvas creation
  createMockScreenshot(isScrolling: boolean = false): Promise<File> {
    if (!this.bttConfig) {
      return Promise.reject('BTT config not loaded');
    }

    const canvasConfig = isScrolling 
      ? this.bttConfig.mockCanvas.scrollingScreenshot
      : this.bttConfig.mockCanvas.screenshot;

    const canvas = document.createElement('canvas');
    canvas.width = canvasConfig.width;
    canvas.height = canvasConfig.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.reject('Canvas context not available');

    // Draw background
    ctx.fillStyle = canvasConfig.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    ctx.fillStyle = canvasConfig.textColor;
    ctx.font = `${canvasConfig.fontSize} ${canvasConfig.fontFamily}`;
    
    if (isScrolling) {
      ctx.fillText(this.bttConfig.mockFileContent.scrollingScreenshotText, 150, 100);
      ctx.fillText('Full webpage/document would appear here', 170, 140);
      ctx.fillText('Much longer than regular screenshot', 200, 180);
      
      // Add multiple content sections
      for (let i = 0; i < canvasConfig.contentSections; i++) {
        ctx.fillText(`Content section ${i + 1}`, 300, 250 + (i * canvasConfig.sectionSpacing));
      }
    } else {
      ctx.fillText(this.bttConfig.mockFileContent.screenshotText, 80, 100);
      ctx.fillText('Real image would appear here', 90, 130);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = isScrolling ? 'scrolling-screenshot.png' : 'screenshot.png';
          resolve(new File([blob], fileName, { type: 'image/png' }));
        }
      });
    });
  }

  // BTT URL parameter handling
  createMockFileFromBTT(action: string, data: string): File {
    if (!this.bttConfig) {
      return new File([''], 'error.txt', { type: 'text/plain' });
    }

    const { mockFileContent } = this.bttConfig;
    
    switch (action) {
      case 'captureText':
        return new File([decodeURIComponent(data)], 'captured-text.txt', { type: 'text/plain' });
      
      case 'captureFile':
        const filePath = decodeURIComponent(data);
        const fileName = filePath.split('/').pop() || 'selected-file';
        const fileContent = `${mockFileContent.finderFilePrefix} ${fileName}\nPath: ${filePath}\n\n${mockFileContent.placeholderSuffix}`;
        return new File([fileContent], fileName, { type: 'text/plain' });
      
      case 'captureUrl':
        const url = decodeURIComponent(data);
        const urlContent = `${mockFileContent.urlFromBrowserPrefix} ${url}\n\n${mockFileContent.placeholderSuffix}`;
        return new File([urlContent], 'webpage-link.url', { type: 'text/plain' });
      
      default:
        return new File(['Unknown BTT action'], 'unknown.txt', { type: 'text/plain' });
    }
  }

  // Debug logging
  logBTTAction(action: string, data?: any): void {
    if (!this.bttConfig) return;
    
    const { debugMessages } = this.bttConfig;
    let message = '';
    
    switch (action) {
      case 'textCapture':
        message = debugMessages.textCapture;
        break;
      case 'imageCapture':
        message = debugMessages.imageCapture;
        break;
      case 'textCapturedViaUrl':
        message = debugMessages.textCapturedViaUrl;
        break;
      case 'fileCapturedViaUrl':
        message = debugMessages.fileCapturedViaUrl;
        break;
      case 'urlCapturedViaBrowser':
        message = debugMessages.urlCapturedViaBrowser;
        break;
      case 'scrollingScreenshotCaptured':
        message = debugMessages.scrollingScreenshotCaptured;
        break;
    }
    
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
}