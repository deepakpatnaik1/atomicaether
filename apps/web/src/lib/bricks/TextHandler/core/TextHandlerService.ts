import type { TextHandlerConfig } from './types.js';

/**
 * TextHandlerService - Extracted text handling logic from Sandbox 11
 * Handles auto-resize calculations and text state management
 */
export class TextHandlerService {
  private config: TextHandlerConfig;
  private textarea: HTMLTextAreaElement | null = null;
  private debounceTimer: number | null = null;

  constructor(config: TextHandlerConfig) {
    this.config = config;
  }

  /**
   * Initialize service with textarea element
   */
  setTextarea(textarea: HTMLTextAreaElement): void {
    this.textarea = textarea;
    this.initializeHeight();
  }

  /**
   * Calculate and apply appropriate height based on content
   * Extracted from Sandbox 11 autoResize() function
   */
  autoResize(): void {
    if (!this.textarea) return;

    // Clear any pending debounced resize
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Apply resize immediately or with debounce
    const performResize = () => {
      if (!this.textarea) return;

      // Temporarily reset height to auto to get accurate scrollHeight
      this.textarea.style.height = 'auto';

      // Calculate desired height based on content
      const scrollHeight = this.textarea.scrollHeight;
      const newHeight = Math.min(
        Math.max(scrollHeight, this.config.autoResize.minHeight),
        this.config.autoResize.maxHeight
      );

      // Apply the new height with smooth transition
      this.textarea.style.height = `${newHeight}px`;

      // Enable/disable scrolling based on max height
      this.textarea.style.overflowY = scrollHeight > this.config.autoResize.maxHeight ? 'auto' : 'hidden';
    };

    // Apply debounce if configured
    const debounceDelay = (this.config as any).performance?.debounceDelay || 0;
    if (debounceDelay > 0) {
      this.debounceTimer = window.setTimeout(performResize, debounceDelay);
    } else {
      performResize();
    }
  }

  /**
   * Reset textarea to minimum height
   * Extracted from Sandbox 11 escape key behavior
   */
  resetHeight(): void {
    if (!this.textarea) return;
    this.textarea.style.height = `${this.config.autoResize.minHeight}px`;
    this.textarea.style.overflowY = 'hidden';
  }

  /**
   * Initialize textarea to minimum height
   */
  private initializeHeight(): void {
    if (!this.textarea) return;
    this.resetHeight();
  }

  /**
   * Get current height of textarea
   */
  getCurrentHeight(): number {
    if (!this.textarea) return this.config.autoResize.minHeight;
    return parseInt(this.textarea.style.height) || this.config.autoResize.minHeight;
  }

  /**
   * Check if textarea is at maximum height
   */
  isAtMaxHeight(): boolean {
    return this.getCurrentHeight() >= this.config.autoResize.maxHeight;
  }

  /**
   * Calculate approximate line count based on current height
   */
  getLineCount(): number {
    const currentHeight = this.getCurrentHeight();
    return Math.round(currentHeight / this.config.autoResize.lineHeight);
  }

  /**
   * Get the actual scroll height of content
   */
  getContentHeight(): number {
    if (!this.textarea) return this.config.autoResize.minHeight;
    
    // Temporarily set height to auto to measure content
    const originalHeight = this.textarea.style.height;
    this.textarea.style.height = 'auto';
    const scrollHeight = this.textarea.scrollHeight;
    this.textarea.style.height = originalHeight;
    
    return scrollHeight;
  }

  /**
   * Check if content would exceed max height
   */
  wouldExceedMaxHeight(additionalText: string = ''): boolean {
    if (!this.textarea) return false;
    
    const originalValue = this.textarea.value;
    this.textarea.value = originalValue + additionalText;
    
    const contentHeight = this.getContentHeight();
    this.textarea.value = originalValue;
    
    return contentHeight > this.config.autoResize.maxHeight;
  }

  /**
   * Apply theme styling to textarea
   */
  applyThemeStyles(theme: any): void {
    if (!this.textarea || !theme?.textHandler?.textarea) return;
    
    const styles = theme.textHandler.textarea;
    Object.assign(this.textarea.style, {
      color: styles.color,
      fontSize: styles.fontSize,
      fontFamily: styles.fontFamily,
      lineHeight: styles.lineHeight,
      transition: styles.transition,
      background: styles.background,
      border: styles.border,
      outline: styles.outline,
      resize: styles.resize,
      boxSizing: styles.boxSizing
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.textarea = null;
  }
}