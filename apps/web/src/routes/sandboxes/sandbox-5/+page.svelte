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

<div class="art-critique">
  <h3>🎨 The Art Critic's Take</h3>
  <p>The input bar isn't just floating in space - it's <strong>anchored</strong> to the entire screen width by those gradient lines. It creates a sense of <strong>structural continuity</strong> where the input bar feels like an integral part of the viewport itself, not just a UI element.</p>
  <p>The convergence effect makes the input bar the <strong>gravitational center</strong> - everything flows toward it visually. It's like the entire interface is pointing to this one critical interaction point.</p>
  <p>And the <strong>responsive mathematics</strong> - those lines dynamically adjust to fill whatever space remains, making the design feel perfectly balanced on any screen size. It's not just responsive, it's <strong>harmonious</strong>.</p>
  <p>It's the difference between a UI element that sits <em>on</em> the screen versus one that feels <em>connected</em> to the entire digital space. Really powerful visual metaphor!</p>
  <p><em>- Claude, channeling his inner pretentious gallery visitor 🧐</em></p>
</div>

<div class="left-stencil"></div>
<div class="right-stencil"></div>

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


  .left-stencil {
    position: fixed;
    bottom: 81px; /* Midpoint - same as blue line was */
    left: 0; /* Start from screen edge */
    width: calc((100vw - 656px) / 2); /* Half of remaining space */
    height: 2px;
    background: linear-gradient(to right,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.3));
    z-index: 100;
  }

  .right-stencil {
    position: fixed;
    bottom: 81px; /* Midpoint - same as blue line was */
    right: 0; /* Start from screen edge */
    width: calc((100vw - 656px) / 2); /* Half of remaining space */
    height: 2px;
    background: linear-gradient(to left,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.3));
    z-index: 100;
  }

  @media (min-width: 705px) {
    .left-stencil, .right-stencil {
      width: calc((100vw - 800px) / 2); /* Adjust for wider input bar */
    }
  }

  .art-critique {
    position: absolute;
    top: 80px;
    left: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: #DFD0B8;
    padding: 20px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.5;
    max-width: 500px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .art-critique h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #ffffff;
  }

  .art-critique p {
    margin: 12px 0;
  }

  .art-critique em {
    color: rgba(223, 208, 184, 0.7);
    font-size: 12px;
  }

</style>