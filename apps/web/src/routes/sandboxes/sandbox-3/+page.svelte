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
    height: 104px;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid;
    border-image: linear-gradient(to bottom,
      rgba(255, 0, 0, 0.3),
      rgba(0, 255, 0, 0.3)) 1;
    border-radius: 9px;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      inset 0 -2px 8px rgba(255, 255, 255, 0.08);
    padding: 22px 20px;
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
</style>