<script lang="ts">
  import { onMount } from 'svelte';
  import { themeSelector, themeApplier } from '$lib/buses';
  import { TextHandler } from '../index.js';
  
  let textHandler: any;
  let currentText = $state('');
  let currentHeight = $state(0);
  let lineCount = $state(1);
  let isAtMax = $state(false);

  // Demo stats
  let escapePressed = $state(false);
  let totalTextChanges = $state(0);
  let totalHeightChanges = $state(0);

  function handleTextChange(event: CustomEvent) {
    currentText = event.detail.text;
    totalTextChanges++;
    escapePressed = false;
  }

  function handleHeightChange(event: CustomEvent) {
    currentHeight = event.detail.height;
    lineCount = event.detail.lineCount;
    totalHeightChanges++;
    if (textHandler) {
      isAtMax = textHandler.isAtMaxHeight();
    }
  }

  function handleEscape(event: CustomEvent) {
    escapePressed = true;
    console.log('Escape pressed:', event.detail);
  }

  function addSampleText() {
    if (textHandler) {
      const sampleText = "This is sample text to test the auto-resize functionality. ";
      textHandler.setText(textHandler.getText() + sampleText);
      currentText = textHandler.getText();
    }
  }

  function clearAll() {
    if (textHandler) {
      textHandler.clearText();
      currentText = '';
    }
  }

  function resetHeight() {
    if (textHandler) {
      textHandler.resetHeight();
    }
  }

  onMount(() => {
    // Apply rainy night theme
    themeApplier.initialize();
    themeSelector.selectTheme('rainy-night');
  });
</script>

<svelte:head>
  <style>
    :root {
      --placeholder-color: rgba(223, 208, 184, 0.6);
    }
    body {
      background: #222831 !important;
      color: #e0e0e0 !important;
      margin: 0;
      padding: 0;
    }
  </style>
</svelte:head>

<nav>
  <a href="/brickdemos">← Back to Brick Demos</a>
  <div class="tagline">BRICK-302 TextHandler - Smart auto-resize textarea like Sandbox 11 input bar</div>
</nav>

<div class="demo-container">
  <div class="stats-panel">
    <h3>Real-time Stats</h3>
    <div class="stat">
      <strong>Current Text Length:</strong> {currentText.length} characters
    </div>
    <div class="stat">
      <strong>Current Height:</strong> {currentHeight}px
    </div>
    <div class="stat">
      <strong>Line Count:</strong> {lineCount} lines
    </div>
    <div class="stat" class:warning={isAtMax}>
      <strong>At Max Height:</strong> {isAtMax ? 'Yes' : 'No'}
    </div>
    <div class="stat">
      <strong>Text Changes:</strong> {totalTextChanges}
    </div>
    <div class="stat">
      <strong>Height Changes:</strong> {totalHeightChanges}
    </div>
    <div class="stat" class:highlight={escapePressed}>
      <strong>Escape Pressed:</strong> {escapePressed ? 'Yes' : 'No'}
    </div>
  </div>

  <div class="features-panel">
    <h3>Features Extracted from Sandbox 11</h3>
    <ul>
      <li>✅ <strong>Fixed position:</strong> Bottom of screen like real input bar</li>
      <li>✅ <strong>Auto-resize:</strong> Grows from 1 to 12 lines (20px each)</li>
      <li>✅ <strong>Smooth transitions:</strong> 0.2s ease animation</li>
      <li>✅ <strong>Escape key:</strong> Clears text and resets height</li>
      <li>✅ <strong>Glass blur:</strong> Same backdrop-filter as Sandbox 11</li>
      <li>✅ <strong>Border styling:</strong> Gradient borders matching theme</li>
      <li>✅ <strong>Overflow management:</strong> Scrolls when exceeding max height</li>
    </ul>
  </div>

  <div class="controls-demo">
    <h3>Test Controls</h3>
    <button onclick={addSampleText}>Add Sample Text</button>
    <button onclick={clearAll}>Clear Text</button>
    <button onclick={resetHeight}>Reset Height</button>
    <p>Type in the input bar below ↓</p>
    <p><strong>Press Escape</strong> to clear and reset</p>
  </div>

  <div class="config-info">
    <h3>Configuration</h3>
    <p><strong>Config:</strong> <code>aetherVault/config/textHandler.json</code></p>
    <p><strong>Theme:</strong> <code>themes/rainy-night.json → textHandler</code></p>
    <p><strong>Min Height:</strong> 20px (1 line)</p>
    <p><strong>Max Height:</strong> 240px (12 lines)</p>
    <p><strong>Line Height:</strong> 20px</p>
    <p><strong>Animation:</strong> height 0.2s ease</p>
  </div>
</div>

<!-- Input bar container - replicated from Sandbox 11 -->
<div class="input-container">
  <div class="input-bar">
    <div class="text-container">
      <TextHandler
        bind:this={textHandler}
        placeholder="Type your message here..."
        on:textChange={handleTextChange}
        on:heightChange={handleHeightChange}
        on:escape={handleEscape}
      />
    </div>
  </div>
</div>

<style>
  nav {
    margin-bottom: 20px;
    padding: 20px;
  }
  
  nav a {
    text-decoration: none;
    color: #007acc;
  }

  .tagline {
    color: rgba(223, 208, 184, 0.7);
    font-size: 14px;
    margin-top: 8px;
    font-style: italic;
  }

  .demo-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 20px 120px 20px; /* Add bottom padding for fixed input */
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }

  /* Input bar container - replicated from Sandbox 11 */
  .input-container {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    width: 650px;
    max-width: calc(100vw - 40px);
    z-index: 100;
  }

  .input-bar {
    min-height: 80px;
    height: auto;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(20px);
    border: 2px solid;
    border-image: linear-gradient(to bottom,
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0.1)) 1;
    border-radius: 9px;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      inset 0 -2px 8px rgba(255, 255, 255, 0.08);
    padding: 16px;
    display: grid;
    grid-template-rows: 1fr;
    transition: all 0.3s ease;
  }

  .text-container {
    grid-row: 1;
    display: flex;
    align-items: flex-start;
  }

  .text-container :global(textarea) {
    width: 100%;
    min-width: 0;
    background: transparent !important;
    border: none !important;
    outline: none !important;
    resize: none !important;
  }

  .stats-panel, .features-panel, .controls-demo, .config-info {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
  }

  .stats-panel h3, .features-panel h3, .controls-demo h3, .config-info h3 {
    margin: 0 0 12px 0;
    color: #fff;
    font-size: 16px;
  }

  .stat {
    padding: 4px 0;
    font-size: 14px;
    color: #e0e0e0;
  }

  .stat.warning {
    color: #ff6b6b;
  }

  .stat.highlight {
    color: #4ecdc4;
  }

  .features-panel ul {
    margin: 0;
    padding-left: 16px;
  }

  .features-panel li {
    margin-bottom: 8px;
    font-size: 14px;
    color: #e0e0e0;
  }

  .controls-demo button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e0e0e0;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
    margin-right: 8px;
    margin-bottom: 8px;
  }

  .controls-demo button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .controls-demo p {
    margin: 12px 0 4px 0;
    font-size: 14px;
    color: #e0e0e0;
  }

  .config-info p {
    margin: 4px 0;
    font-size: 14px;
    color: #e0e0e0;
  }

  .config-info code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 4px;
    border-radius: 2px;
    color: #4ecdc4;
  }

  @media (max-width: 768px) {
    .input-container {
      width: calc(100vw - 40px);
    }
  }
</style>