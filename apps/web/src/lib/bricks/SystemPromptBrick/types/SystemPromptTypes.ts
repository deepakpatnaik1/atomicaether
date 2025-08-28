/**
 * SystemPromptBrick Types
 * LEGO Brick for template loading and variable substitution
 */

export interface SystemPromptTemplate {
  name: string;
  content: string;
  variables: string[];
  provider?: 'openai' | 'claude' | 'universal';
}

export interface PromptVariables {
  [key: string]: string | number | boolean;
}

export interface RenderedPrompt {
  content: string;
  templateName: string;
  variables: PromptVariables;
  timestamp: number;
}

export interface SystemPromptConfig {
  templatesPath: string;
  defaultVariables: PromptVariables;
  enableHotReload: boolean;
}

export interface TemplateLoadEvent {
  templateName: string;
  success: boolean;
  error?: string;
}

export interface PromptRenderEvent {
  templateName: string;
  variables: PromptVariables;
  success: boolean;
  content?: string;
  error?: string;
}