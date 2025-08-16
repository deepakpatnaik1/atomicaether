<script lang="ts">
  import { onMount } from 'svelte';
  import { themeSelector, themeApplier } from '$lib/buses';
  
  let files: File[] = $state([]);
  let fileInput: HTMLInputElement;
  let textarea: HTMLTextAreaElement;
  let textContent = $state('');
  
  // Dropdown states
  let showModelDropdown = $state(false);
  let showPersonaDropdown = $state(false);
  let showThemeDropdown = $state(false);
  
  // Current selections
  let selectedModel = $state('claude-3.5-sonnet');
  let selectedPersona = $state('User');
  let selectedTheme = $state('rainy-night');
  
  // Options data
  const models = [
    'claude-3.5-sonnet',
    'claude-3-opus',
    'claude-3-haiku',
    'gpt-4-turbo',
    'gpt-4o',
    'gemini-1.5-pro'
  ];
  
  const personas = [
    'User',
    'Developer',
    'Designer',
    'Product Manager',
    'Data Scientist',
    'Writer'
  ];
  
  const themes = [
    'rainy-night',
    'midnight-blue',
    'forest-green',
    'sunset-orange',
    'arctic-white',
    'deep-purple'
  ];
  
  // Auto-resize constants
  const LINE_HEIGHT = 20; // pixels per line
  const MIN_LINES = 1;
  const MAX_LINES = 12;
  const MIN_HEIGHT = LINE_HEIGHT * MIN_LINES;
  const MAX_HEIGHT = LINE_HEIGHT * MAX_LINES;
  
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
      textContent = '';
      if (textarea) {
        textarea.style.height = `${MIN_HEIGHT}px`;
      }
    }
  }
  
  function autoResize() {
    if (!textarea) return;
    
    // Temporarily reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate desired height based on content
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    
    // Apply the new height with smooth transition
    textarea.style.height = `${newHeight}px`;
    
    // Enable/disable scrolling based on max height
    textarea.style.overflowY = scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }
  
  function handleTextInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    textContent = target.value;
    autoResize();
  }
  
  // Dropdown functions
  function toggleModelDropdown() {
    showModelDropdown = !showModelDropdown;
    showPersonaDropdown = false;
    showThemeDropdown = false;
  }
  
  function togglePersonaDropdown() {
    showPersonaDropdown = !showPersonaDropdown;
    showModelDropdown = false;
    showThemeDropdown = false;
  }
  
  function toggleThemeDropdown() {
    showThemeDropdown = !showThemeDropdown;
    showModelDropdown = false;
    showPersonaDropdown = false;
  }
  
  function selectModel(model: string) {
    selectedModel = model;
    showModelDropdown = false;
  }
  
  function selectPersona(persona: string) {
    selectedPersona = persona;
    showPersonaDropdown = false;
  }
  
  function selectTheme(theme: string) {
    selectedTheme = theme;
    showThemeDropdown = false;
    // Apply theme change
    themeSelector.selectTheme(theme);
  }
  
  // Close dropdowns when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      showModelDropdown = false;
      showPersonaDropdown = false;
      showThemeDropdown = false;
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

  // Mock API endpoints for BetterTouchTool testing
  function simulateCaptureText(text: string) {
    console.log('🎯 BTT Text Capture:', text);
    const textFile = new File([text], 'captured-text.txt', { type: 'text/plain' });
    files = [...files, textFile];
  }

  function simulateCaptureImage(imageBlob: Blob) {
    console.log('🎯 BTT Image Capture:', imageBlob);
    const imageFile = new File([imageBlob], 'screenshot.png', { type: 'image/png' });
    files = [...files, imageFile];
  }

  // Enhanced API for BetterTouchTool integration
  function handleUrlCapture() {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const data = params.get('data');
    
    if (action === 'captureText' && data) {
      const textFile = new File([decodeURIComponent(data)], 'captured-text.txt', { type: 'text/plain' });
      files = [...files, textFile];
      console.log('🎯 BTT Text Captured via URL:', decodeURIComponent(data));
      
      // Clear URL params after processing
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (action === 'captureFile' && data) {
      // Handle file path from Finder selection
      const filePath = decodeURIComponent(data);
      const fileName = filePath.split('/').pop() || 'selected-file';
      
      // Create a mock file representation (in real implementation, we'd read the actual file)
      const mockFileContent = `📁 File from Finder: ${fileName}\nPath: ${filePath}\n\n[In the real brick, this would be the actual file content]`;
      const fileFile = new File([mockFileContent], fileName, { type: 'text/plain' });
      files = [...files, fileFile];
      console.log('🎯 BTT File Captured via URL:', filePath);
      
      // Clear URL params after processing
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (action === 'captureUrl' && data) {
      // Handle URL from browser
      const url = decodeURIComponent(data);
      
      // Create a URL file representation
      const urlContent = `🔗 URL from Browser: ${url}\n\n[In the real brick, this would show website preview/metadata]`;
      const urlFile = new File([urlContent], 'webpage-link.url', { type: 'text/plain' });
      files = [...files, urlFile];
      console.log('🎯 BTT URL Captured via Browser:', url);
      
      // Clear URL params after processing
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (action === 'captureScrollingImage' && data === 'clipboard') {
      // Handle scrolling screenshot
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1200; // Longer for scrolling screenshot
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = '#1A4B73';
      ctx!.fillRect(0, 0, 800, 1200);
      ctx!.fillStyle = 'white';
      ctx!.font = '20px Arial';
      ctx!.fillText('📜 Scrolling Screenshot captured via BTT', 150, 100);
      ctx!.fillText('Full webpage/document would appear here', 170, 140);
      ctx!.fillText('Much longer than regular screenshot', 200, 180);
      
      // Add some visual elements to show it's a long screenshot
      for (let i = 0; i < 10; i++) {
        ctx!.fillText(`Content section ${i + 1}`, 300, 250 + (i * 80));
      }
      
      canvas.toBlob(blob => {
        if (blob) {
          const imageFile = new File([blob], 'scrolling-screenshot.png', { type: 'image/png' });
          files = [...files, imageFile];
          console.log('🎯 BTT Scrolling Screenshot Captured via URL');
        }
      });
      
      // Clear URL params after processing
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (action === 'captureImage' && data === 'clipboard') {
      // For now, create a mock screenshot since we can't access clipboard directly from web
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = '#2D4A87';
      ctx!.fillRect(0, 0, 400, 200);
      ctx!.fillStyle = 'white';
      ctx!.font = '16px Arial';
      ctx!.fillText('📸 Screenshot captured via BTT', 80, 100);
      ctx!.fillText('Real image would appear here', 90, 130);
      
      canvas.toBlob(blob => {
        if (blob) {
          const imageFile = new File([blob], 'screenshot.png', { type: 'image/png' });
          files = [...files, imageFile];
          console.log('🎯 BTT Screenshot Captured via URL');
        }
      });
      
      // Clear URL params after processing
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // Check for URL parameters on mount and focus
  onMount(() => {
    handleUrlCapture();
    
    // Listen for focus events (when BTT brings window to front)
    window.addEventListener('focus', handleUrlCapture);
    
    // Initialize textarea height
    if (textarea) {
      textarea.style.height = `${MIN_HEIGHT}px`;
    }
    
    return () => {
      window.removeEventListener('focus', handleUrlCapture);
    };
  });

  // Expose functions globally for testing
  if (typeof window !== 'undefined') {
    (window as any).simulateCaptureText = simulateCaptureText;
    (window as any).simulateCaptureImage = simulateCaptureImage;
    (window as any).bttCaptureText = (text: string) => {
      const textFile = new File([text], 'captured-text.txt', { type: 'text/plain' });
      files = [...files, textFile];
      console.log('🎯 BTT Direct Text Capture:', text);
    };
    (window as any).bttCaptureImage = (imageBlob: Blob) => {
      const imageFile = new File([imageBlob], 'screenshot.png', { type: 'image/png' });
      files = [...files, imageFile];
      console.log('🎯 BTT Direct Image Capture');
    };
  }
</script>

<nav>
  <a href="/sandboxes">← Back to Sandboxes</a>
  <div class="tagline">Input bar grows with text and snaps back when text deleted</div>
</nav>



<div class="left-stencil"></div>
<div class="right-stencil"></div>

<svelte:window on:keydown={handleKeydown} on:click={handleClickOutside} />

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
    <textarea 
      bind:this={textarea}
      bind:value={textContent}
      class="text-input" 
      placeholder="Type a message..."
      on:input={handleTextInput}
      rows="1"
    ></textarea>
    <div class="controls-row">
      <button class="plus-button" on:click={handleFileSelect}>
        <div class="plus-icon"></div>
      </button>
      
      <!-- Model Picker Dropdown -->
      <div class="dropdown-container">
        <button class="dropdown-trigger" on:click={toggleModelDropdown}>
          <div class="chevron" class:up={showModelDropdown}></div>
          <span>{selectedModel}</span>
        </button>
        {#if showModelDropdown}
          <div class="dropdown-menu">
            {#each models as model}
              <button 
                class="dropdown-item" 
                class:selected={model === selectedModel}
                on:click={() => selectModel(model)}
              >
                {model}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- Persona Picker Dropdown -->
      <div class="dropdown-container">
        <button class="dropdown-trigger" on:click={togglePersonaDropdown}>
          <div class="chevron" class:up={showPersonaDropdown}></div>
          <span>{selectedPersona}</span>
        </button>
        {#if showPersonaDropdown}
          <div class="dropdown-menu">
            {#each personas as persona}
              <button 
                class="dropdown-item" 
                class:selected={persona === selectedPersona}
                on:click={() => selectPersona(persona)}
              >
                {persona}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- Theme Picker Dropdown -->
      <div class="dropdown-container">
        <button class="dropdown-trigger" on:click={toggleThemeDropdown}>
          <div class="chevron" class:up={showThemeDropdown}></div>
          <span>{selectedTheme}</span>
        </button>
        {#if showThemeDropdown}
          <div class="dropdown-menu">
            {#each themes as theme}
              <button 
                class="dropdown-item" 
                class:selected={theme === selectedTheme}
                on:click={() => selectTheme(theme)}
              >
                {theme}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
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

  .tagline {
    color: rgba(223, 208, 184, 0.7);
    font-size: 14px;
    margin-top: 8px;
    font-style: italic;
  }

  .input-container {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    width: 650px; /* Reduced to fit within 704px container with room for margins */
    max-width: calc(100vw - 40px); /* Ensure it never exceeds viewport with padding */
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
    height: 20px;
    min-height: 20px;
    max-height: 240px; /* 12 lines * 20px */
    line-height: 20px;
    grid-row: 2;
    transition: height 0.2s ease;
    overflow-y: hidden;
    box-sizing: border-box;
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
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .plus-button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .plus-icon {
    width: 10px;
    height: 10px;
    position: relative;
  }

  .plus-icon::before,
  .plus-icon::after {
    content: '';
    position: absolute;
    background: rgba(223, 208, 184, 0.7);
  }

  .plus-icon::before {
    top: 50%;
    left: 0;
    width: 100%;
    height: 1.5px;
    transform: translateY(-50%);
  }

  .plus-icon::after {
    top: 0;
    left: 50%;
    width: 1.5px;
    height: 100%;
    transform: translateX(-50%);
  }

  .dropdown-container {
    position: relative;
  }

  .dropdown-trigger {
    background: transparent;
    border: none;
    color: rgba(223, 208, 184, 0.7);
    font-size: 12px;
    font-family: system-ui;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .dropdown-trigger:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .chevron {
    width: 8px;
    height: 8px;
    border: none;
    border-right: 1.5px solid rgba(223, 208, 184, 0.5);
    border-bottom: 1.5px solid rgba(223, 208, 184, 0.5);
    transform: rotate(45deg);
    margin-right: 6px;
    align-self: flex-start;
    background: transparent;
  }

  .chevron.up {
    border: none;
    border-left: 1.5px solid rgba(223, 208, 184, 0.5);
    border-top: 1.5px solid rgba(223, 208, 184, 0.5);
    transform: rotate(45deg);
    align-self: flex-end;
    background: transparent;
  }

  .dropdown-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 8px;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    min-width: 150px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-item {
    display: block;
    width: 100%;
    background: transparent;
    border: none;
    color: rgba(223, 208, 184, 0.8);
    font-size: 12px;
    font-family: system-ui;
    text-align: left;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .dropdown-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .dropdown-item.selected {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(223, 208, 184, 1);
  }

  .dropdown-item:first-child {
    border-radius: 8px 8px 0 0;
  }

  .dropdown-item:last-child {
    border-radius: 0 0 8px 8px;
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
    width: calc((100vw - 650px) / 2); /* Half of remaining space */
    min-width: 20px; /* Ensure minimum visibility */
    height: 2px;
    background: linear-gradient(to right,
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0.5));
    z-index: 1000;
    /* Chrome compatibility */
    will-change: opacity;
    backface-visibility: hidden;
  }

  .right-stencil {
    position: fixed;
    bottom: 81px; /* Midpoint - same as blue line was */
    right: 0; /* Start from screen edge */
    width: calc((100vw - 650px) / 2); /* Half of remaining space */
    min-width: 20px; /* Ensure minimum visibility */
    height: 2px;
    background: linear-gradient(to left,
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0.5));
    z-index: 1000;
    /* Chrome compatibility */
    will-change: opacity;
    backface-visibility: hidden;
  }

  @media (min-width: 705px) {
    .left-stencil, .right-stencil {
      width: calc((100vw - 800px) / 2); /* Adjust for wider input bar */
    }
  }

  .test-controls {
    position: absolute;
    top: 80px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: #DFD0B8;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 400px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .test-controls h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #ffffff;
  }

  .test-btn {
    display: block;
    width: 100%;
    margin-bottom: 12px;
    padding: 12px 16px;
    background: rgba(74, 144, 226, 0.8);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1.4;
    transition: background 0.2s ease;
  }

  .test-btn:hover {
    background: rgba(74, 144, 226, 1);
  }

  .test-btn:last-child {
    margin-bottom: 0;
  }

  .test-section {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .test-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .test-section h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #ffffff;
    opacity: 0.9;
  }

  .btt-instructions {
    background: rgba(0, 0, 0, 0.5);
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .btt-instructions p {
    margin: 8px 0 4px 0;
    font-size: 12px;
    color: #ffffff;
  }

  .btt-instructions code {
    display: block;
    background: rgba(255, 255, 255, 0.05);
    padding: 8px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-size: 10px;
    line-height: 1.4;
    color: #DFD0B8;
    margin-bottom: 12px;
    word-break: break-all;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  #current-url {
    color: #4A90E2;
    font-weight: bold;
  }


</style>