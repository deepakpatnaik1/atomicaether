import type { DemoMetadata } from '../models/DemoMetadata';

export class MetadataExtractor {
  /**
   * Extract metadata from demo file content
   * Looks for <!-- demo-meta: {...} --> comment
   */
  static extract(content: string, path: string): DemoMetadata | null {
    try {
      // Find the metadata comment
      const metaMatch = content.match(/<!--\s*demo-meta:\s*(\{[\s\S]*?\})\s*-->/);
      
      if (!metaMatch) {
        console.warn(`[DemoRegistry] No metadata found in ${path}`);
        return null;
      }
      
      // Parse the JSON
      const metaJson = metaMatch[1];
      const metadata = JSON.parse(metaJson) as Partial<DemoMetadata>;
      
      // Extract ID from path (/demo/event-bus/ -> event-bus)
      const id = this.extractIdFromPath(path);
      
      // Ensure required fields with defaults
      return {
        id,
        name: metadata.name || id,
        series: metadata.series || '000s',
        category: metadata.category || 'Uncategorized',
        description: metadata.description || 'No description provided',
        status: metadata.status || 'wip',
        tags: metadata.tags || [],
        created: metadata.created,
        proves: metadata.proves
      };
    } catch (error) {
      console.error(`[DemoRegistry] Failed to extract metadata from ${path}:`, error);
      return null;
    }
  }
  
  /**
   * Extract ID from file path
   * /src/routes/demo/event-bus/+page.svelte -> event-bus
   */
  static extractIdFromPath(path: string): string {
    const match = path.match(/\/demo\/([^/]+)\//);
    if (match) {
      return match[1];
    }
    
    // Fallback: use filename without extension
    const filename = path.split('/').pop() || 'unknown';
    return filename.replace(/\+page\.svelte$/, '').replace(/\.svelte$/, '');
  }
  
  /**
   * Validate metadata has required fields
   */
  static validate(metadata: DemoMetadata, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (!(field in metadata) || metadata[field as keyof DemoMetadata] === undefined) {
        console.warn(`[DemoRegistry] Missing required field '${field}' in demo ${metadata.id}`);
        return false;
      }
    }
    return true;
  }
}