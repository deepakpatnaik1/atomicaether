export type DemoStatus = 'stable' | 'wip' | 'broken';

export interface DemoMetadata {
  id: string;              // Extracted from folder name
  name: string;            // Display name
  series: string;          // 100s, 200s, etc.
  category: string;        // Buses, UI, etc.
  description: string;     // One-liner
  status: DemoStatus;      // Current state
  tags: string[];          // For search
  created?: string;        // ISO date
  proves?: string[];       // What this demo proves works
}

export interface DemoEntry {
  metadata: DemoMetadata;
  path: string;            // File path
  component?: any;         // Lazy-loaded Svelte component
}

export interface DemoStats {
  total: number;
  stable: number;
  wip: number;
  broken: number;
  bySeries: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface DemoRegistryConfig {
  scanPaths: string[];
  metadataPattern: string;
  autoRefresh: boolean;
  sorting: {
    default: string;
    options: string[];
  };
  grouping: {
    enabled: boolean;
    by: string;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
  validation: {
    requireMetadata: boolean;
    requiredFields: string[];
  };
}