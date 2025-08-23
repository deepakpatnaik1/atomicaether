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
  /* Paragraph styling - from rainy-night.json scrollback.layout.paragraph */
  :global(p) {
    margin-bottom: 12px;
    margin-top: 0;
  }
  
  :global(p:last-child) {
    margin-bottom: 0;
  }
  
  /* Bold text - from rainy-night.json scrollback.message.boldWeight */
  :global(strong),
  :global(b) {
    font-weight: 600;
  }
  
  /* Links - from rainy-night.json navigation.link */
  :global(a) {
    color: #007acc;
    text-decoration: none;
  }
  
  :global(a:hover) {
    text-decoration: underline;
  }
  
  /* Lists - from rainy-night.json scrollback.layout.bullet */
  :global(ul),
  :global(ol) {
    margin: 12px 0;
    padding-left: 8px;
  }
  
  :global(li) {
    margin-bottom: 4px;
    margin-left: 8px;
  }
  
  /* Bullet colors by speaker */
  .markdown-content[data-speaker="boss"] :global(li)::marker {
    color: #ef4444 !important;
  }
  
  .markdown-content[data-speaker="samara"] :global(li)::marker {
    color: #f97316 !important;
  }
  
  /* Headings - colored by speaker */
  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3),
  .markdown-content :global(h4),
  .markdown-content :global(h5),
  .markdown-content :global(h6) {
    font-weight: 600;
    margin-top: 16px;
    margin-bottom: 8px;
  }
  
  /* Boss headers - red from rainy-night.json */
  .markdown-content[data-speaker="boss"] :global(h1),
  .markdown-content[data-speaker="boss"] :global(h2),
  .markdown-content[data-speaker="boss"] :global(h3),
  .markdown-content[data-speaker="boss"] :global(h4),
  .markdown-content[data-speaker="boss"] :global(h5),
  .markdown-content[data-speaker="boss"] :global(h6) {
    color: #ef4444 !important;
  }
  
  /* Samara headers - orange from rainy-night.json */
  .markdown-content[data-speaker="samara"] :global(h1),
  .markdown-content[data-speaker="samara"] :global(h2),
  .markdown-content[data-speaker="samara"] :global(h3),
  .markdown-content[data-speaker="samara"] :global(h4),
  .markdown-content[data-speaker="samara"] :global(h5),
  .markdown-content[data-speaker="samara"] :global(h6) {
    color: #f97316 !important;
  }
  
  :global(h1) {
    font-size: 1.5em;
  }
  
  :global(h2) {
    font-size: 1.3em;
  }
  
  :global(h3) {
    font-size: 1.1em;
  }
  
  /* Code styling - using input bar styling as reference */
  :global(code) {
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.95em;
  }
  
  :global(pre) {
    background: rgba(0, 0, 0, 0.3);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
  }
  
  :global(pre code) {
    background: transparent;
    padding: 0;
  }
  
  /* Blockquotes - using file preview zone styling as inspiration */
  :global(blockquote) {
    border-left: 3px solid rgba(223, 208, 184, 0.3);
    padding-left: 16px;
    margin: 12px 0;
    opacity: 0.9;
  }
  
  /* Horizontal rules */
  :global(hr) {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 20px 0;
  }
  
  /* Tables - using dropdown menu styling as reference */
  :global(table) {
    border-collapse: collapse;
    margin: 12px 0;
    width: 100%;
  }
  
  :global(th),
  :global(td) {
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 8px 12px;
    text-align: left;
  }
  
  :global(th) {
    background: rgba(255, 255, 255, 0.05);
    font-weight: 600;
  }
  
  :global(tr:nth-child(even)) {
    background: rgba(255, 255, 255, 0.02);
  }
  
  /* Emphasis */
  :global(em),
  :global(i) {
    font-style: italic;
  }
  
  /* Strikethrough */
  :global(del),
  :global(s) {
    text-decoration: line-through;
    opacity: 0.7;
  }
</style>