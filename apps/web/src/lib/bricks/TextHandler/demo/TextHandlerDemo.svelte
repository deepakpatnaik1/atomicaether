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
  <div class="tagline">BRICK-302 TextHandler - Smart auto-resize textarea with config-driven behavior</div>
</nav>

<div class="demo-container">
  <div class="main-demo">
    <h2>TextHandler Demo</h2>
    <p>Type text to see auto-resize in action. Press Escape to clear and reset.</p>
    
    <div class="text-container">
      <TextHandler
        bind:this={textHandler}
        placeholder="Type your message here..."
        on:textChange={handleTextChange}
        on:heightChange={handleHeightChange}
        on:escape={handleEscape}
      />
    </div>

    <div class="controls">
      <button onclick={addSampleText}>Add Sample Text</button>
      <button onclick={clearAll}>Clear Text</button>
      <button onclick={resetHeight}>Reset Height</button>
    </div>
  </div>

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
      <li>✅ <strong>Auto-resize:</strong> Grows from 1 to 12 lines (20px each)</li>
      <li>✅ <strong>Smooth transitions:</strong> 0.2s ease animation</li>
      <li>✅ <strong>Escape key:</strong> Clears text and resets height</li>
      <li>✅ <strong>Overflow management:</strong> Scrolls when exceeding max height</li>
      <li>✅ <strong>Config-driven:</strong> All behavior from textHandler.json</li>
      <li>✅ <strong>Theme integration:</strong> Colors from rainy-night.json</li>
      <li>✅ <strong>Event system:</strong> Text and height change notifications</li>
    </ul>
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
    padding: 20px;
    display: grid;
    grid-template-columns: 1fr 300px;
    grid-template-rows: auto auto;
    gap: 20px;
  }

  .main-demo {
    grid-column: 1;
    grid-row: 1 / -1;
  }

  .text-container {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    min-height: 200px;
    display: flex;
    align-items: flex-start;
  }

  .text-container :global(textarea) {
    width: 100%;
    min-width: 0;
  }

  .controls {
    display: flex;
    gap: 12px;
    margin: 20px 0;
  }

  .controls button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e0e0e0;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .controls button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .stats-panel, .features-panel, .config-info {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .stats-panel h3, .features-panel h3, .config-info h3 {
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
    .demo-container {
      grid-template-columns: 1fr;
    }
    
    .main-demo {
      grid-column: 1;
      grid-row: auto;
    }
  }
</style>