<script lang="ts">
  import { onMount } from 'svelte';
  import { themeSelector, themeApplier } from '$lib/buses';
  
  let files: File[] = $state([]);
  let fileInput: HTMLInputElement;
  
  onMount(() => {
    // Apply rainy night theme
    themeApplier.initialize();
    themeSelector.selectTheme('rainy-night');
  });

  function handleFileSelect() {
    fileInput.click();
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      files = Array.from(target.files);
    }
  }

  function removeFile(fileToRemove: File) {
    files = files.filter(file => file !== fileToRemove);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      files = [];
      fileInput.value = '';
    }
  }

  function getFilePreviewUrl(file: File): string {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return ''; // Generic file icon placeholder
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      files = Array.from(event.dataTransfer.files);
    }
  }
</script>

<nav>
  <a href="/sandboxes">← Back to Sandboxes</a>
</nav>


<div class="left-stencil"></div>
<div class="right-stencil"></div>

<svelte:window on:keydown={handleKeydown} />

<input type="file" multiple bind:this={fileInput} on:change={handleFileChange} style="display: none;" accept="image/*,.pdf,.doc,.docx,.txt" />

<div class="input-container">
  <div class="input-bar" on:dragover={handleDragOver} on:drop={handleDrop}>
    {#if files.length > 0}
      <div class="file-preview-zone">
        {#each files as file}
          <div class="file-preview">
            {#if file.type.startsWith('image/')}
              <img src={getFilePreviewUrl(file)} alt={file.name} />
            {:else}
              <div class="file-icon">📄</div>
            {/if}
            <span class="file-name">{file.name}</span>
            <button class="remove-file" on:click={() => removeFile(file)}>×</button>
          </div>
        {/each}
      </div>
    {/if}
    <textarea class="text-input" placeholder="Type a message..."></textarea>
    <div class="controls-row">
      <button class="plus-button" on:click={handleFileSelect}>+</button>
      <span class="model-picker">claude-3.5-sonnet</span>
      <span class="persona-picker">User</span>
      <span class="theme-picker">rainy-night</span>
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
    grid-template-rows: auto 1fr auto;
    gap: 12px;
    transition: all 0.3s ease;
  }

  .file-preview-zone {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    grid-row: 1;
  }

  .file-preview {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 8px;
    min-width: 80px;
    max-width: 120px;
  }

  .file-preview img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
  }

  .file-icon {
    font-size: 40px;
    opacity: 0.8;
  }

  .file-name {
    font-size: 10px;
    color: rgba(223, 208, 184, 0.8);
    text-align: center;
    margin-top: 4px;
    word-break: break-all;
    line-height: 1.2;
  }

  .remove-file {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 0, 0, 0.8);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .remove-file:hover {
    background: rgba(255, 0, 0, 1);
  }

  .text-input {
    background: transparent;
    border: none;
    outline: none;
    color: #DFD0B8;
    font-size: 14px;
    font-family: system-ui;
    resize: none;
    min-height: 20px;
    grid-row: 2;
  }

  .text-input::placeholder {
    color: rgba(223, 208, 184, 0.6);
  }

  .controls-row {
    display: flex;
    align-items: center;
    gap: 12px;
    grid-row: 3;
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
  .persona-picker,
  .theme-picker {
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


</style>