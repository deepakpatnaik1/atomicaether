import type { DemoEntry, DemoMetadata, DemoStats, DemoRegistryConfig, DemoStatus } from '../models/DemoMetadata';
import { MetadataExtractor } from '../utils/MetadataExtractor';

export class DemoRegistry {
  private demos = new Map<string, DemoEntry>();
  private config: DemoRegistryConfig | null = null;
  private initialized = false;
  private lastRefresh: Date | null = null;
  private demoModules: Record<string, () => Promise<any>> = {};
  
  /**
   * Initialize the registry and discover demos
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load config
      const response = await fetch('/config/demoRegistry.json');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }
      this.config = await response.json();
      
      // Discover demos
      await this.discover();
      
      this.initialized = true;
      console.log(`[DemoRegistry] Initialized with ${this.demos.size} demos`);
    } catch (error) {
      console.error('[DemoRegistry] Failed to initialize:', error);
      throw error;
    }
  }
  
  /**
   * Discover all demos using Vite's import.meta.glob
   */
  async discover(): Promise<void> {
    if (!this.config) {
      throw new Error('DemoRegistry not configured');
    }
    
    console.log('[DemoRegistry] Starting discovery...');
    
    // Use Vite's glob to find all demo files
    // Note: The path must be a string literal for Vite to process it
    const modules = import.meta.glob('/src/routes/demo/*/+page.svelte', { 
      as: 'raw',
      eager: false 
    });
    
    // Store modules for lazy loading
    this.demoModules = import.meta.glob('/src/routes/demo/*/+page.svelte', {
      eager: false
    });
    
    // Process each found module
    for (const [path, loadContent] of Object.entries(modules)) {
      try {
        // Load the raw content to extract metadata
        const content = await (loadContent as () => Promise<string>)();
        
        // Extract metadata
        const metadata = MetadataExtractor.extract(content, path);
        
        if (!metadata) {
          console.warn(`[DemoRegistry] Skipping ${path} - no metadata`);
          continue;
        }
        
        // Validate if required
        if (this.config.validation.requireMetadata) {
          const isValid = MetadataExtractor.validate(metadata, this.config.validation.requiredFields);
          if (!isValid) {
            console.warn(`[DemoRegistry] Skipping ${path} - invalid metadata`);
            continue;
          }
        }
        
        // Store the demo entry
        const entry: DemoEntry = {
          metadata,
          path,
          component: undefined // Will be lazy-loaded
        };
        
        this.demos.set(metadata.id, entry);
        console.log(`[DemoRegistry] Registered demo: ${metadata.id}`);
        
        // TODO: Publish event when EventBus is available
        // eventBus.publish('demo:registered', { demo: entry });
        
      } catch (error) {
        console.error(`[DemoRegistry] Failed to process ${path}:`, error);
      }
    }
    
    this.lastRefresh = new Date();
    console.log(`[DemoRegistry] Discovery complete. Found ${this.demos.size} demos`);
  }
  
  /**
   * Refresh the demo catalog
   */
  async refresh(): Promise<void> {
    this.demos.clear();
    await this.discover();
  }
  
  /**
   * Get all demos
   */
  getAll(): DemoEntry[] {
    return Array.from(this.demos.values());
  }
  
  /**
   * Get demo by ID
   */
  getById(id: string): DemoEntry | undefined {
    return this.demos.get(id);
  }
  
  /**
   * Get demos by series (e.g., '100s', '200s')
   */
  getBySeries(series: string): DemoEntry[] {
    return this.getAll().filter(demo => demo.metadata.series === series);
  }
  
  /**
   * Get demos by status
   */
  getByStatus(status: DemoStatus): DemoEntry[] {
    return this.getAll().filter(demo => demo.metadata.status === status);
  }
  
  /**
   * Search demos by query
   */
  search(query: string): DemoEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(demo => {
      const meta = demo.metadata;
      return (
        meta.name.toLowerCase().includes(lowerQuery) ||
        meta.description.toLowerCase().includes(lowerQuery) ||
        meta.category.toLowerCase().includes(lowerQuery) ||
        meta.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }
  
  /**
   * Filter demos with custom predicate
   */
  filter(predicate: (demo: DemoEntry) => boolean): DemoEntry[] {
    return this.getAll().filter(predicate);
  }
  
  /**
   * Get all unique series
   */
  getAllSeries(): string[] {
    const series = new Set<string>();
    this.getAll().forEach(demo => series.add(demo.metadata.series));
    return Array.from(series).sort();
  }
  
  /**
   * Get all unique categories
   */
  getAllCategories(): string[] {
    const categories = new Set<string>();
    this.getAll().forEach(demo => categories.add(demo.metadata.category));
    return Array.from(categories).sort();
  }
  
  /**
   * Get statistics about demos
   */
  getStats(): DemoStats {
    const all = this.getAll();
    const bySeries: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    all.forEach(demo => {
      const series = demo.metadata.series;
      const category = demo.metadata.category;
      bySeries[series] = (bySeries[series] || 0) + 1;
      byCategory[category] = (byCategory[category] || 0) + 1;
    });
    
    return {
      total: all.length,
      stable: all.filter(d => d.metadata.status === 'stable').length,
      wip: all.filter(d => d.metadata.status === 'wip').length,
      broken: all.filter(d => d.metadata.status === 'broken').length,
      bySeries,
      byCategory
    };
  }
  
  /**
   * Sort demos by field
   */
  sort(demos: DemoEntry[], field: keyof DemoMetadata): DemoEntry[] {
    return [...demos].sort((a, b) => {
      const aVal = a.metadata[field];
      const bVal = b.metadata[field];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      
      return 0;
    });
  }
  
  /**
   * Group demos by field
   */
  groupBy(field: keyof DemoMetadata): Map<string, DemoEntry[]> {
    const groups = new Map<string, DemoEntry[]>();
    
    this.getAll().forEach(demo => {
      const key = String(demo.metadata[field]);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(demo);
    });
    
    return groups;
  }
  
  /**
   * Load demo component lazily
   */
  async loadComponent(id: string): Promise<any> {
    const demo = this.demos.get(id);
    if (!demo) {
      throw new Error(`Demo ${id} not found`);
    }
    
    // Return cached component if available
    if (demo.component) {
      return demo.component;
    }
    
    // Load the component
    const modulePath = demo.path;
    if (this.demoModules[modulePath]) {
      const module = await this.demoModules[modulePath]();
      demo.component = module.default || module;
      return demo.component;
    }
    
    throw new Error(`No module found for demo ${id}`);
  }
  
  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Get last refresh time
   */
  getLastRefresh(): Date | null {
    return this.lastRefresh;
  }
}