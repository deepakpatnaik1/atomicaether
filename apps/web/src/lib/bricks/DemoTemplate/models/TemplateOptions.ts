export interface TemplateOptions {
  name: string;
  series?: string;
  category?: string;
  description?: string;
  tags?: string[];
  status?: 'stable' | 'wip' | 'broken';
}

export interface TemplateConfig {
  outputPath: string;
  templateSections: {
    actions: boolean;
    state: boolean;
    output: boolean;
    debug: boolean;
    reset: boolean;
  };
  defaultMetadata: {
    series: string;
    status: string;
    category: string;
    tags: string[];
    description: string;
  };
  styling: {
    containerClass: string;
    sectionClass: string;
    buttonClass: string;
  };
}