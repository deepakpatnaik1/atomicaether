<script lang="ts">
  import { onMount } from 'svelte';
  import { themeSelector, themeApplier } from '$lib/buses';
  
  onMount(() => {
    // Apply rainy night theme
    themeApplier.initialize();
    themeSelector.selectTheme('rainy-night');
  });
</script>

<nav>
  <a href="/sandboxes">← Back to Sandboxes</a>
</nav>

<div class="observations">
  <h3>📏 Input Bar Measurements</h3>
  <p><strong>CSS height:</strong> 80px (what we set)</p>
  <p><strong>Actual rendered height:</strong> 114px (measured with lines)</p>
  <p><strong>Top border position:</strong> 138px from bottom (white line)</p>
  <p><strong>Bottom border position:</strong> 24px from bottom (red line)</p>
  <p><strong>Midpoint:</strong> 81px from bottom (blue line)</p>
  <p><strong>Border thickness:</strong> 2px (set in CSS)</p>
  <p><strong>Padding:</strong> 16px all sides (set in CSS)</p>
  <p><strong>Gap between text/controls:</strong> 22px (set in CSS)</p>
  <p>💡 <em>Why 114px total? CSS height + borders + box-model behavior</em></p>
</div>

<div class="white-line"></div>
<div class="white-line-bottom"></div>
<div class="blue-line"></div>

<div class="input-container">
  <div class="input-bar">
    <textarea class="text-input" placeholder="Type a message..."></textarea>
    <div class="controls-row">
      <button class="plus-button">+</button>
      <span class="model-picker">claude-3.5-sonnet</span>
      <span class="persona-picker">User</span>
      <div class="green-indicator"></div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    background: var(--app-background, #222831) !important;
    color: var(--text-color, #e0e0e0) !important;
    transition: all 0.3s ease;
    margin: 0;
    padding: 0;
  }
  
  nav {
    margin-bottom: 20px;
    padding: 20px;
  }
  
  nav a {
    text-decoration: none;
    color: #007acc;
  }

  .input-container {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    width: 656px;
  }

  @media (min-width: 705px) {
    .input-container {
      width: 800px;
    }
  }

  .input-bar {
    height: 80px;
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
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .text-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #DFD0B8;
    font-size: 14px;
    font-family: system-ui;
    resize: none;
  }

  .text-input::placeholder {
    color: rgba(223, 208, 184, 0.6);
  }

  .controls-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .plus-button {
    background: transparent;
    border: none;
    color: rgba(223, 208, 184, 0.7);
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .model-picker,
  .persona-picker {
    color: rgba(223, 208, 184, 0.7);
    font-size: 12px;
    font-family: system-ui;
    cursor: pointer;
  }

  .green-indicator {
    width: 8px;
    height: 8px;
    background: #00ff00;
    border-radius: 50%;
    box-shadow:
      0 0 4px #00ff00,
      0 0 8px rgba(0, 255, 0, 0.5);
    margin-left: auto;
  }

  .white-line {
    position: fixed;
    bottom: 138px;
    left: 0;
    right: 0;
    height: 1px;
    background: white;
    z-index: 100;
  }

  .white-line-bottom {
    position: fixed;
    bottom: 24px; /* Start with original bottom position */
    left: 0;
    right: 0;
    height: 1px;
    background: red;
    z-index: 100;
  }

  .blue-line {
    position: fixed;
    bottom: 81px; /* Midpoint between 24px and 138px */
    left: 0;
    right: 0;
    height: 1px;
    background: blue;
    z-index: 100;
  }


  .observations {
    position: absolute;
    top: 100px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: #DFD0B8;
    padding: 16px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.4;
    max-width: 400px;
  }

  .observations h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
  }

  .observations p {
    margin: 4px 0;
  }
</style>