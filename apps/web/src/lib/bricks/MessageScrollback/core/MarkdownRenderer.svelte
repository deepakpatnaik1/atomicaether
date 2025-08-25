<script lang="ts">
  import { marked } from 'marked';
  
  interface Props {
    content: string;
    speaker?: 'boss' | 'samara';
  }
  
  let { content, speaker = 'boss' }: Props = $props();
  
  // Configure marked for safe rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });
  
  // Parse markdown to HTML
  let htmlContent = $derived(marked(content || ''));
</script>

<div class="markdown-content" data-speaker={speaker}>
  {@html htmlContent}
</div>

<style>
  /* All styles now use theme variables */
  
  /* Paragraphs */
  :global(p) {
    margin-bottom: var(--markdown-paragraph-margin-bottom);
    margin-top: var(--markdown-paragraph-margin-top);
  }
  
  :global(p:last-child) {
    margin-bottom: 0;
  }
  
  /* Bold text with speaker colors */
  :global(strong),
  :global(b) {
    font-weight: var(--typography-font-weight-semibold);
  }
  
  .markdown-content[data-speaker="boss"] :global(strong) {
    color: var(--markdown-speaker-boss-strong) !important;
  }
  
  .markdown-content[data-speaker="samara"] :global(strong) {
    color: var(--markdown-speaker-samara-strong) !important;
  }
  
  /* Links */
  :global(a) {
    color: var(--markdown-link-color);
    text-decoration: none;
  }
  
  :global(a:hover) {
    text-decoration: underline;
  }
  
  /* Headings */
  :global(h1) {
    font-size: var(--markdown-heading-h1-font-size);
    font-weight: var(--markdown-heading-h1-font-weight);
    margin-bottom: var(--markdown-heading-h1-margin-bottom);
    margin-top: var(--markdown-heading-h1-margin-top);
  }
  
  :global(h2) {
    font-size: var(--markdown-heading-h2-font-size);
    font-weight: var(--markdown-heading-h2-font-weight);
    margin-bottom: var(--markdown-heading-h2-margin-bottom);
    margin-top: var(--markdown-heading-h2-margin-top);
  }
  
  :global(h3) {
    font-size: var(--markdown-heading-h3-font-size);
    font-weight: var(--markdown-heading-h3-font-weight);
    margin-bottom: var(--markdown-heading-h3-margin-bottom);
    margin-top: var(--markdown-heading-h3-margin-top);
  }
  
  /* Lists */
  :global(ul),
  :global(ol) {
    padding-left: var(--markdown-list-padding-left);
    margin-bottom: var(--markdown-list-margin-bottom);
    margin-top: var(--markdown-list-margin-top);
  }
  
  :global(li) {
    margin-bottom: var(--spacing-micro);
  }
  
  /* Code */
  :global(code) {
    background: var(--markdown-code-background);
    padding: var(--markdown-code-padding);
    border-radius: var(--markdown-code-border-radius);
    font-size: var(--markdown-code-font-size);
    color: var(--markdown-code-color);
  }
  
  :global(pre) {
    background: var(--markdown-code-block-background);
    padding: var(--markdown-code-block-padding);
    border-radius: var(--markdown-code-block-border-radius);
    overflow-x: auto;
    margin-bottom: var(--markdown-paragraph-margin-bottom);
  }
  
  :global(pre code) {
    background: transparent;
    padding: 0;
    font-size: var(--markdown-code-block-font-size);
    font-family: var(--markdown-code-block-font-family);
  }
  
  /* Blockquotes */
  :global(blockquote) {
    border-left: var(--markdown-blockquote-border-left);
    padding-left: var(--markdown-blockquote-padding-left);
    margin-left: var(--markdown-blockquote-margin-left);
    opacity: var(--markdown-blockquote-opacity);
  }
  
  /* Horizontal rules */
  :global(hr) {
    border: var(--markdown-hr-border);
    border-top: var(--markdown-hr-border-top);
    margin: var(--markdown-hr-margin);
  }
  
  /* Tables */
  :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: var(--markdown-paragraph-margin-bottom);
  }
  
  :global(th),
  :global(td) {
    padding: var(--spacing-small);
    border: var(--borders-style-subtle);
    text-align: left;
  }
  
  :global(th) {
    background: rgba(255, 255, 255, 0.05);
    font-weight: var(--typography-font-weight-semibold);
  }
  
  /* Images */
  :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--borders-radius-medium);
  }
  
  /* Line breaks */
  :global(br) {
    line-height: var(--typography-line-height-normal);
  }
</style>