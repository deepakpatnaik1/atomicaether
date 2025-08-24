<script lang="ts">
  import { onMount } from 'svelte';
  import { configBus, eventBus } from '../../../buses';
  import { InputBarService } from './InputBarService.js';
  import { fileUploadService } from '../../../services/FileUploadService.js';
  import type { InputBarConfig, InputBarBehavior, DropdownData, RainyNightTheme, BTTConfig, FallbackMappings } from './types.js';
  
  // State
  let files: File[] = $state([]);
  let fileUrls: string[] = $state([]);
  let uploadProgress: number[] = $state([]);
  let isUploading = $state(false);
  let fileInput: HTMLInputElement;
  let textarea: HTMLTextAreaElement;
  let textContent = $state('');
  
  // FOUC prevention states
  let isReady = $state(false);
  let placeholderText = $state('');
  
  // Dropdown states
  let showModelDropdown = $state(false);
  let showPersonaDropdown = $state(false);
  let showThemeDropdown = $state(false);
  
  // Current selections - start empty to prevent flicker
  let selectedModel = $state('');
  let selectedPersona = $state('');
  let selectedTheme = $state('');
  
  // Config state
  let layout: InputBarConfig | null = $state(null);
  let behavior: InputBarBehavior | null = $state(null);
  let dropdownData: DropdownData | null = $state(null);
  let theme: RainyNightTheme | null = $state(null);
  let bttConfig: BTTConfig | null = $state(null);
  let fallbackMappings: FallbackMappings | null = $state(null);
  
  // Service
  let service: InputBarService;

  onMount(async () => {
    // Small delay to ensure styles are loaded
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Set text content to prevent flicker
    placeholderText = 'Type a message...';
    selectedModel = 'claude-sonnet-4-20250514';
    selectedPersona = 'user';
    selectedTheme = 'rainy-night';
    isReady = true;
    
    // Load all configs
    layout = await configBus.load('inputBarLayout');
    behavior = await configBus.load('inputBarBehavior');
    dropdownData = await configBus.load('dropdownData');
    bttConfig = await configBus.load('betterTouchTool');
    theme = await configBus.load('themes/rainy-night');
    fallbackMappings = await configBus.load('fallbackMappings');
    
    // Initialize service
    service = new InputBarService(behavior, bttConfig);
    
    // Set defaults from config first
    if (dropdownData) {
      selectedModel = dropdownData.defaults.selectedModel;
      selectedPersona = dropdownData.defaults.selectedPersona;
      selectedTheme = dropdownData.defaults.selectedTheme;
    }
    
    // Request persisted values (will override defaults if they exist)
    eventBus.publish('selection:model:request', {});
    eventBus.publish('selection:persona:request', {});
    eventBus.publish('selection:theme:request', {});
    
    // Listen for responses with persisted values
    eventBus.subscribe('selection:model:current', (data: any) => {
      if (data.model) {
        selectedModel = data.model;
      }
    });
    
    eventBus.subscribe('selection:persona:current', (data: any) => {
      if (data.persona) {
        selectedPersona = data.persona;
      }
    });
    
    eventBus.subscribe('selection:theme:current', (data: any) => {
      if (data.theme) {
        selectedTheme = data.theme;
      }
    });
    
    // Initialize textarea height
    if (textarea && behavior) {
      textarea.style.height = `${behavior.autoResize.minHeight}px`;
    }
    
    // Auto-focus textarea when app loads
    focusInputBar();
    
    // Handle URL capture
    handleUrlCapture();
    
    // Listen for focus events (when BTT brings window to front)
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  function handleFileSelect() {
    fileInput.click();
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      const newFiles = Array.from(target.files);
      files = [...files, ...newFiles];
      uploadProgress = [...uploadProgress, ...newFiles.map(() => 0)];
      
      // Upload files immediately
      isUploading = true;
      try {
        const startIndex = fileUrls.length;
        const newUrls = await fileUploadService.uploadFiles(
          newFiles,
          (fileIndex, percent) => {
            uploadProgress[startIndex + fileIndex] = percent;
          }
        );
        fileUrls = [...fileUrls, ...newUrls];
      } catch (error) {
        console.error('File upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
        eventBus.publish('error:show', {
          message: `Upload failed: ${errorMessage}`,
          type: 'error'
        });
        // Remove failed files
        files = files.slice(0, fileUrls.length);
        uploadProgress = uploadProgress.slice(0, fileUrls.length);
      } finally {
        isUploading = false;
        // Restore focus to textarea
        focusInputBar();
      }
    }
  }

  function removeFile(index: number) {
    files = files.filter((_, i) => i !== index);
    fileUrls = fileUrls.filter((_, i) => i !== index);
    uploadProgress = uploadProgress.filter((_, i) => i !== index);
  }

  function focusInputBar() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  }

  function handleWindowFocus() {
    // Handle URL capture (existing functionality)
    handleUrlCapture();
    
    // Auto-focus textarea when window regains focus
    focusInputBar();
  }

  function handleVisibilityChange() {
    // Auto-focus textarea when tab becomes visible
    if (!document.hidden) {
      focusInputBar();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      // First priority: Close any open dropdown menus
      const hadDropdownOpen = showModelDropdown || showPersonaDropdown || showThemeDropdown;
      if (hadDropdownOpen) {
        showModelDropdown = false;
        showPersonaDropdown = false;
        showThemeDropdown = false;
        // Restore focus to input after closing dropdown
        focusInputBar();
        return;
      }
      
      // Second priority: Clear content if configured and no dropdowns were open
      if (service) {
        if (service.shouldClearOnEscape('files')) {
          files = [];
          fileInput.value = '';
        }
        if (service.shouldClearOnEscape('text')) {
          textContent = '';
        }
        if (service.shouldClearOnEscape('height') && textarea && behavior) {
          textarea.style.height = `${behavior.autoResize.minHeight}px`;
        }
      }
    }
  }
  
  function handleTextareaKeydown(event: KeyboardEvent) {
    // Handle Enter key - send message unless Shift is held
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
    // Shift+Enter will naturally create a newline
  }
  
  function sendMessage() {
    // Don't send if uploading
    if (isUploading) {
      return;
    }
    
    // Don't send empty messages
    if (!textContent.trim() && fileUrls.length === 0) {
      return;
    }
    
    // Package up the message data with URLs instead of files
    const messageData = {
      text: textContent,
      fileUrls: fileUrls,  // Changed from files to fileUrls
      files: files.map(f => ({ name: f.name, type: f.type, size: f.size })), // Metadata only
      model: selectedModel,
      persona: selectedPersona,
      timestamp: Date.now()
    };
    
    // Broadcast the event - we don't know or care who's listening
    eventBus.publish('input:submit', messageData);
    
    // Clear the input
    textContent = '';
    files = [];
    fileUrls = [];
    uploadProgress = [];
    fileInput.value = '';
    
    // Reset textarea height
    if (textarea && behavior) {
      textarea.style.height = `${behavior.autoResize.minHeight}px`;
    }
    
    // Keep focus on textarea for continued conversation
    focusInputBar();
  }
  
  function autoResize() {
    if (!textarea || !service) return;
    
    const newHeight = service.calculateTextAreaHeight(textarea);
    textarea.style.height = newHeight;
    
    // Enable/disable scrolling based on max height
    if (behavior) {
      textarea.style.overflowY = textarea.scrollHeight > behavior.autoResize.maxHeight ? 'auto' : 'hidden';
    }
  }
  
  function handleTextInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    textContent = target.value;
    autoResize();
  }
  
  // Dropdown functions
  function toggleModelDropdown() {
    showModelDropdown = !showModelDropdown;
    if (behavior?.dropdownBehavior.exclusiveDropdowns.enabled) {
      showPersonaDropdown = false;
      showThemeDropdown = false;
    }
  }
  
  function togglePersonaDropdown() {
    showPersonaDropdown = !showPersonaDropdown;
    if (behavior?.dropdownBehavior.exclusiveDropdowns.enabled) {
      showModelDropdown = false;
      showThemeDropdown = false;
    }
  }
  
  function toggleThemeDropdown() {
    showThemeDropdown = !showThemeDropdown;
    if (behavior?.dropdownBehavior.exclusiveDropdowns.enabled) {
      showModelDropdown = false;
      showPersonaDropdown = false;
    }
  }
  
  function selectModel(model: string) {
    selectedModel = model;
    showModelDropdown = false;
    // Publish change event for persistence
    eventBus.publish('selection:model:changed', { model });
    // Restore focus to input after dropdown interaction
    focusInputBar();
  }
  
  function selectPersona(persona: string) {
    selectedPersona = persona;
    showPersonaDropdown = false;
    // Publish change event for persistence
    eventBus.publish('selection:persona:changed', { persona });
    // Restore focus to input after dropdown interaction
    focusInputBar();
  }
  
  function selectTheme(themeId: string) {
    selectedTheme = themeId;
    showThemeDropdown = false;
    // Publish change event for persistence
    eventBus.publish('selection:theme:changed', { theme: themeId });
    // Restore focus to input after dropdown interaction
    focusInputBar();
  }
  
  // Helper functions to get human-readable names
  function getSelectedModelName() {
    // Use config-driven fallbacks for initial render before dropdownData loads
    if (!dropdownData) {
      return fallbackMappings?.models[selectedModel] || selectedModel;
    }
    // Filter out metadata fields (starting with _) and only process actual data
    for (const [company, modelList] of Object.entries(dropdownData.models)) {
      if (!company.startsWith('_') && Array.isArray(modelList)) {
        const found = modelList.find(m => m.id === selectedModel);
        if (found) return found.name;
      }
    }
    return selectedModel;
  }
  
  function getSelectedPersonaName() {
    // Use config-driven fallbacks for initial render before dropdownData loads
    if (!dropdownData) {
      return fallbackMappings?.personas[selectedPersona] || selectedPersona;
    }
    // Filter out metadata fields (starting with _) and only process actual data
    for (const [category, personaList] of Object.entries(dropdownData.personas)) {
      if (!category.startsWith('_') && Array.isArray(personaList)) {
        const found = personaList.find(p => p.id === selectedPersona);
        if (found) return found.name;
      }
    }
    return selectedPersona;
  }
  
  function getSelectedThemeName() {
    // Use config-driven fallbacks for initial render before dropdownData loads
    if (!dropdownData) {
      return fallbackMappings?.themes[selectedTheme] || selectedTheme;
    }
    // Filter out metadata fields (starting with _) and only process actual data
    for (const [category, themeList] of Object.entries(dropdownData.themes)) {
      if (!category.startsWith('_') && Array.isArray(themeList)) {
        const found = themeList.find(t => t.id === selectedTheme);
        if (found) return found.name;
      }
    }
    return selectedTheme;
  }
  
  // Close dropdowns when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (!behavior?.dropdownBehavior.clickOutsideToClose.enabled) return;
    
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      const hadDropdownOpen = showModelDropdown || showPersonaDropdown || showThemeDropdown;
      showModelDropdown = false;
      showPersonaDropdown = false;
      showThemeDropdown = false;
      
      // Restore focus to input if a dropdown was open
      if (hadDropdownOpen) {
        focusInputBar();
      }
    }
  }

  function getFilePreviewUrl(file: File): string {
    return service ? service.getFilePreviewUrl(file) : '';
  }

  function handleDragOver(event: DragEvent) {
    if (behavior?.fileHandling.dragAndDrop.preventDefaultBehavior) {
      event.preventDefault();
    }
  }

  function handleDrop(event: DragEvent) {
    if (behavior?.fileHandling.dragAndDrop.preventDefaultBehavior) {
      event.preventDefault();
    }
    if (event.dataTransfer?.files) {
      files = Array.from(event.dataTransfer.files);
    }
  }

  // BetterTouchTool integration
  function handleUrlCapture() {
    if (typeof window === 'undefined' || !service) return;
    
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const data = params.get('data');
    
    if (!action || !data) return;
    
    if (action === 'captureText' || action === 'captureFile' || action === 'captureUrl') {
      const mockFile = service.createMockFileFromBTT(action, data);
      files = [...files, mockFile];
      service.logBTTAction('textCapturedViaUrl', decodeURIComponent(data));
      
      // Clear URL params after processing
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (action === 'captureImage' && data === 'clipboard') {
      service.createMockScreenshot(false).then(imageFile => {
        files = [...files, imageFile];
        service.logBTTAction('scrollingScreenshotCaptured');
      });
      
      // Clear URL params after processing
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (action === 'captureScrollingImage' && data === 'clipboard') {
      service.createMockScreenshot(true).then(imageFile => {
        files = [...files, imageFile];
        service.logBTTAction('scrollingScreenshotCaptured');
      });
      
      // Clear URL params after processing
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // Expose functions globally for testing
  if (typeof window !== 'undefined') {
    (window as any).bttCaptureText = (text: string) => {
      if (service) {
        const textFile = new File([text], 'captured-text.txt', { type: 'text/plain' });
        files = [...files, textFile];
        service.logBTTAction('textCapture', text);
      }
    };
    (window as any).bttCaptureImage = (imageBlob: Blob) => {
      if (service) {
        const imageFile = new File([imageBlob], 'screenshot.png', { type: 'image/png' });
        files = [...files, imageFile];
        service.logBTTAction('imageCapture');
      }
    };
  }
</script>

<!-- Set CSS custom properties for theme colors -->
<svelte:head>
  {#if theme}
    <style>
      :root {
        --placeholder-color: {theme.textInput.typography.placeholderColor};
        --selected-text-color: {theme.textInput.typography.selectedColor};
        --hover-background: {theme.interactiveStates.hoverBackground};
        --selected-background: {theme.interactiveStates.selectedBackground};
        --remove-button-hover: {theme.interactiveStates.removeButtonHover};
        --icon-background: {theme.controlsRow.plusButton.icon.color};
        --chevron-color: {theme.controlsRow.dropdownTrigger.chevron.color};
        --dropdown-z-index: {layout?.dropdown.menu.zIndex || '1000'};
      }
    </style>
  {/if}
</svelte:head>

<svelte:window onkeydown={handleKeydown} onclick={handleClickOutside} />

<input 
  type="file" 
  multiple 
  bind:this={fileInput} 
  onchange={handleFileChange} 
  style="display: none;" 
  accept="image/*,.pdf,.doc,.docx,.txt" 
/>

<!-- Stencil Lines -->
<div 
  class="left-stencil"
  style="
    bottom: {layout?.stencils.positioning.bottom || '81px'};
    height: {layout?.stencils.positioning.height || '2px'};
    z-index: {layout?.stencils.positioning.zIndex || '1000'};
    width: {layout?.stencils.dimensions.defaultWidth || 'calc((100vw - 650px) / 2)'};
    min-width: {layout?.stencils.dimensions.minWidth || '20px'};
    background: {theme?.stencils.gradient.left || 'linear-gradient(to right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.5))'};
  "
></div>

<div 
  class="right-stencil"
  style="
    bottom: {layout?.stencils.positioning.bottom || '81px'};
    height: {layout?.stencils.positioning.height || '2px'};
    z-index: {layout?.stencils.positioning.zIndex || '1000'};
    width: {layout?.stencils.dimensions.defaultWidth || 'calc((100vw - 650px) / 2)'};
    min-width: {layout?.stencils.dimensions.minWidth || '20px'};
    background: {theme?.stencils.gradient.right || 'linear-gradient(to left, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.5))'};
  "
></div>

<!-- Input Container -->
<div 
  class="input-container"
  style="
    bottom: {layout?.container.positioning.bottom || '24px'};
    width: {layout?.container.dimensions.defaultWidth || '650px'};
    max-width: {layout?.container.dimensions.maxWidth || 'calc(100vw - 40px)'};
    z-index: {layout?.container.positioning.zIndex || '1000'};
    opacity: {isReady ? '1' : '0'};
    transition: opacity 0.2s ease;
  "
>
  <!-- File Preview Zone - Outside Input Bar -->
  {#if files.length > 0}
    <div 
      class="file-preview-zone external"
      style="
        background: {theme?.filePreviewZone.background || 'rgba(255, 255, 255, 0.1)'};
        border-radius: {theme?.filePreviewZone.border.radius || '6px'};
        padding: {layout?.filePreviewZone.spacing.padding || '12px'};
        border: 1px solid {theme?.filePreviewZone.border.color || 'rgba(255, 255, 255, 0.2)'};
        gap: {layout?.filePreviewZone.spacing.itemGap || '8px'};
        margin-bottom: 12px;
        backdrop-filter: {theme?.inputBar.background.backdropFilter || 'blur(20px)'};
      "
    >
      {#each files as file, index}
        <div 
          class="file-preview"
          style="
            background: {theme?.filePreviewZone.filePreview.background || 'rgba(0, 0, 0, 0.3)'};
            border-radius: {theme?.filePreviewZone.filePreview.borderRadius || '6px'};
            padding: {layout?.filePreviewZone.filePreview.padding || '8px'};
            min-width: {layout?.filePreviewZone.filePreview.minWidth || '80px'};
            max-width: {layout?.filePreviewZone.filePreview.maxWidth || '120px'};
            position: relative;
          "
        >
          {#if file.type.startsWith('image/')}
            <img 
              src={fileUrls[index] || service?.getFilePreviewUrl(file)} 
              alt={file.name}
              style="
                width: 100%;
                height: auto;
                border-radius: 4px;
                max-height: 80px;
                opacity: {uploadProgress[index] < 100 ? 0.5 : 1};
                object-fit: cover;
              "
            />
          {:else}
            <div 
              class="file-icon"
              style="
                width: 100%;
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                color: #fff;
                font-size: 24px;
              "
            >📄</div>
          {/if}
          <span 
            class="file-name"
            style="
              display: block;
              margin-top: 4px;
              font-size: 10px;
              color: rgba(255, 255, 255, 0.8);
              text-align: center;
              word-break: break-all;
              line-height: 1.2;
            "
          >{file.name}</span>
          <button 
            class="remove-file" 
            onclick={() => removeFile(index)}
            style="
              position: absolute;
              width: {layout?.filePreviewZone.removeButton.size || '20px'};
              height: {layout?.filePreviewZone.removeButton.size || '20px'};
              top: {layout?.filePreviewZone.removeButton.position.top || '-4px'};
              right: {layout?.filePreviewZone.removeButton.position.right || '-4px'};
              background: {theme?.filePreviewZone.removeButton.background || 'rgba(255, 0, 0, 0.8)'};
            "
          >×</button>
        </div>
      {/each}
    </div>
  {/if}

  <div 
    class="input-bar" 
    ondragover={handleDragOver} 
    ondrop={handleDrop}
    role="region"
    aria-label="File drop zone"
    style="
      min-height: {layout?.container.dimensions.minHeight || '80px'};
      background: {theme?.inputBar.background.color || 'rgba(0, 0, 0, 0.85)'};
      backdrop-filter: {theme?.inputBar.background.backdropFilter || 'blur(20px)'};
      border: {theme?.inputBar.border.width || '2px'} {theme?.inputBar.border.style || 'solid'};
      border-image: linear-gradient(to bottom, {theme?.inputBar.border.gradientTop || 'rgba(255, 255, 255, 0.3)'}, {theme?.inputBar.border.gradientBottom || 'rgba(255, 255, 255, 0.1)'}) 1;
      border-radius: {theme?.inputBar.border.radius || '9px'};
      box-shadow: {theme?.inputBar.shadow.outer || '0 4px 12px rgba(0, 0, 0, 0.4)'}, {theme?.inputBar.shadow.inner || 'inset 0 -2px 8px rgba(255, 255, 255, 0.08)'};
      padding: {layout?.container.spacing.padding || '16px'};
      gap: {layout?.container.spacing.gridGap || '12px'};
      transition: {layout?.animation.globalTransition || 'all 0.3s ease'};
    "
  >
    
    <!-- Text Input -->
    <textarea 
      bind:this={textarea}
      bind:value={textContent}
      class="text-input" 
      placeholder={placeholderText}
      oninput={handleTextInput}
      onkeydown={handleTextareaKeydown}
      rows="1"
      style="
        color: {theme?.textInput.typography.color || '#DFD0B8'};
        font-size: {layout?.textInput.typography.fontSize || '14px'};
        font-family: {layout?.textInput.typography.fontFamily || 'system-ui'};
        line-height: {layout?.textInput.autoResize.lineHeight || '20px'};
        min-height: {layout?.textInput.autoResize.minHeight || '20px'};
        max-height: {layout?.textInput.autoResize.maxHeight || '240px'};
        transition: {layout?.animation.inputResize || 'height 0.2s ease'};
      "
    ></textarea>
    
    <!-- Controls Row -->
    <div 
      class="controls-row"
      style="gap: {layout?.controlsRow.layout.gap || '12px'};"
    >
      <!-- Plus Button -->
      <button 
        class="plus-button" 
        onclick={handleFileSelect}
        aria-label="Attach files"
        style="
          padding: {layout?.controlsRow.plusButton.padding || '4px 8px'};
          border-radius: {layout?.controlsRow.plusButton.borderRadius || '4px'};
          transition: {layout?.animation.hoverTransition || 'background-color 0.2s ease'};
        "
      >
        <div 
          class="plus-icon"
          style="
            width: {layout?.controlsRow.plusButton.icon.size || '10px'};
            height: {layout?.controlsRow.plusButton.icon.size || '10px'};
          "
        ></div>
      </button>
      
      <!-- Model Picker Dropdown -->
      <div class="dropdown-container">
        <button 
          class="dropdown-trigger" 
          onclick={toggleModelDropdown}
          style="
            font-size: {layout?.controlsRow.dropdownTrigger.fontSize || '12px'};
            padding: {layout?.controlsRow.dropdownTrigger.padding || '4px 8px'};
            border-radius: {layout?.controlsRow.dropdownTrigger.borderRadius || '4px'};
            color: {theme?.controlsRow.dropdownTrigger.color || 'rgba(223, 208, 184, 0.7)'};
            transition: {layout?.animation.hoverTransition || 'background-color 0.2s ease'};
          "
        >
          <div 
            class="chevron" 
            class:up={showModelDropdown}
          ></div>
          <span>{getSelectedModelName()}</span>
        </button>
        {#if showModelDropdown && dropdownData}
          <div 
            class="dropdown-menu"
            style="
              width: {layout?.dropdown.menu.width || '280px'};
              margin-bottom: {layout?.dropdown.menu.marginBottom || '8px'};
              background: {theme?.dropdown.menu.background || 'rgba(0, 0, 0, 0.9)'};
              backdrop-filter: {theme?.dropdown.menu.backdropFilter || 'blur(20px)'};
              border: {theme?.dropdown.menu.border || '1px solid rgba(255, 255, 255, 0.2)'};
              border-radius: {theme?.dropdown.menu.borderRadius || '8px'};
              box-shadow: {theme?.dropdown.menu.shadow || '0 8px 32px rgba(0, 0, 0, 0.4)'};
              animation: slideUp {layout?.animation.dropdownAnimation || '0.2s'} ease;
            "
          >
            {#if dropdownData}
              {#each Object.entries(dropdownData.models).filter(([key]) => !key.startsWith('_')) as [category, models]}
                <div class="dropdown-section">
                  <div 
                    class="section-header"
                    style="
                      color: {theme?.dropdown.sectionHeader.color || 'rgba(255, 255, 255, 0.9)'};
                      font-size: {layout?.dropdown.sectionHeader.fontSize || '11px'};
                      padding: {layout?.dropdown.sectionHeader.padding || '8px 12px 4px 12px'};
                      border-bottom: {theme?.dropdown.sectionHeader.borderBottom || '1px solid rgba(255, 255, 255, 0.1)'};
                      margin-bottom: {layout?.dropdown.sectionHeader.marginBottom || '4px'};
                    "
                  >
                    {category}
                  </div>
                  <div class="section-content">
                    {#each models as model}
                      <button 
                        class="dropdown-item model-row" 
                        class:selected={model.id === selectedModel}
                        onclick={() => selectModel(model.id)}
                        style="
                          padding: {layout?.dropdown.item.padding || '8px 12px'};
                          font-size: {layout?.dropdown.item.fontSize || '12px'};
                          color: {theme?.dropdown.item.color || 'rgba(223, 208, 184, 0.8)'};
                          transition: {layout?.animation.hoverTransition || 'background-color 0.2s ease'};
                        "
                      >
                        <span 
                          class="model-name"
                          style="font-size: {layout?.dropdown.modelRow.modelName.fontSize || '12px'};"
                        >
                          {model.name}
                        </span>
                        <span 
                          class="model-id"
                          style="
                            font-size: {layout?.dropdown.modelRow.modelId.fontSize || '10px'};
                            margin-left: {layout?.dropdown.modelRow.modelId.marginLeft || '16px'};
                            opacity: 0.6;
                          "
                        >
                          {model.id}
                        </span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Persona Picker Dropdown -->
      <div class="dropdown-container">
        <button 
          class="dropdown-trigger" 
          onclick={togglePersonaDropdown}
          style="
            font-size: {layout?.controlsRow.dropdownTrigger.fontSize || '12px'};
            padding: {layout?.controlsRow.dropdownTrigger.padding || '4px 8px'};
            border-radius: {layout?.controlsRow.dropdownTrigger.borderRadius || '4px'};
            color: {theme?.controlsRow.dropdownTrigger.color || 'rgba(223, 208, 184, 0.7)'};
            transition: {layout?.animation.hoverTransition || 'background-color 0.2s ease'};
          "
        >
          <div 
            class="chevron" 
            class:up={showPersonaDropdown}
          ></div>
          <span>{getSelectedPersonaName()}</span>
        </button>
        {#if showPersonaDropdown && dropdownData}
          <div 
            class="dropdown-menu persona-menu"
            style="
              width: {layout?.dropdown.menu.width || '280px'};
              margin-bottom: {layout?.dropdown.menu.marginBottom || '8px'};
              background: {theme?.dropdown.menu.background || 'rgba(0, 0, 0, 0.9)'};
              backdrop-filter: {theme?.dropdown.menu.backdropFilter || 'blur(20px)'};
              border: {theme?.dropdown.menu.border || '1px solid rgba(255, 255, 255, 0.2)'};
              border-radius: {theme?.dropdown.menu.borderRadius || '8px'};
              box-shadow: {theme?.dropdown.menu.shadow || '0 8px 32px rgba(0, 0, 0, 0.4)'};
              animation: slideUp {layout?.animation.dropdownAnimation || '0.2s'} ease;
            "
          >
            {#if dropdownData}
              {#each Object.entries(dropdownData.personas).filter(([key]) => !key.startsWith('_')) as [category, personas]}
                <div class="dropdown-section">
                  <div 
                    class="section-header"
                    style="
                      color: {theme?.dropdown.sectionHeader.color || 'rgba(255, 255, 255, 0.9)'};
                      font-size: {layout?.dropdown.sectionHeader.fontSize || '11px'};
                      padding: {layout?.dropdown.sectionHeader.padding || '8px 12px 4px 12px'};
                      border-bottom: {theme?.dropdown.sectionHeader.borderBottom || '1px solid rgba(255, 255, 255, 0.1)'};
                      margin-bottom: {layout?.dropdown.sectionHeader.marginBottom || '4px'};
                    "
                  >
                    {category}
                  </div>
                  <div class="section-content">
                    {#each personas as persona}
                      <button 
                        class="dropdown-item model-row" 
                        class:selected={persona.id === selectedPersona}
                        onclick={() => selectPersona(persona.id)}
                        style="
                          padding: {layout?.dropdown.item.padding || '8px 12px'};
                          font-size: {layout?.dropdown.item.fontSize || '12px'};
                          color: {theme?.dropdown.item.color || 'rgba(223, 208, 184, 0.8)'};
                          transition: {layout?.animation.hoverTransition || 'background-color 0.2s ease'};
                        "
                      >
                        <span class="model-name">{persona.name}</span>
                        <span class="model-id">{persona.id}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Theme Picker Dropdown -->
      <div class="dropdown-container">
        <button 
          class="dropdown-trigger" 
          onclick={toggleThemeDropdown}
          style="
            font-size: {layout?.controlsRow.dropdownTrigger.fontSize || '12px'};
            padding: {layout?.controlsRow.dropdownTrigger.padding || '4px 8px'};
            border-radius: {layout?.controlsRow.dropdownTrigger.borderRadius || '4px'};
            color: {theme?.controlsRow.dropdownTrigger.color || 'rgba(223, 208, 184, 0.7)'};
            transition: {layout?.animation.hoverTransition || 'background-color 0.2s ease'};
          "
        >
          <div 
            class="chevron" 
            class:up={showThemeDropdown}
          ></div>
          <span>{getSelectedThemeName()}</span>
        </button>
        {#if showThemeDropdown && dropdownData}
          <div 
            class="dropdown-menu"
            style="
              width: {layout?.dropdown.menu.width || '280px'};
              margin-bottom: {layout?.dropdown.menu.marginBottom || '8px'};
              background: {theme?.dropdown.menu.background || 'rgba(0, 0, 0, 0.9)'};
              backdrop-filter: {theme?.dropdown.menu.backdropFilter || 'blur(20px)'};
              border: {theme?.dropdown.menu.border || '1px solid rgba(255, 255, 255, 0.2)'};
              border-radius: {theme?.dropdown.menu.borderRadius || '8px'};
              box-shadow: {theme?.dropdown.menu.shadow || '0 8px 32px rgba(0, 0, 0, 0.4)'};
              animation: slideUp {layout?.animation.dropdownAnimation || '0.2s'} ease;
            "
          >
            {#if dropdownData}
              {#each Object.entries(dropdownData.themes).filter(([key]) => !key.startsWith('_')) as [category, themes]}
                <div class="dropdown-section">
                  <div 
                    class="section-header"
                    style="
                      color: {theme?.dropdown.sectionHeader.color || 'rgba(255, 255, 255, 0.9)'};
                      font-size: {layout?.dropdown.sectionHeader.fontSize || '11px'};
                      padding: {layout?.dropdown.sectionHeader.padding || '8px 12px 4px 12px'};
                      border-bottom: {theme?.dropdown.sectionHeader.borderBottom || '1px solid rgba(255, 255, 255, 0.1)'};
                      margin-bottom: {layout?.dropdown.sectionHeader.marginBottom || '4px'};
                    "
                  >
                    {category}
                  </div>
                  <div class="section-content">
                    {#each themes as themeItem}
                      <button 
                        class="dropdown-item model-row" 
                        class:selected={themeItem.id === selectedTheme}
                        onclick={() => selectTheme(themeItem.id)}
                        style="
                          padding: {layout?.dropdown.item.padding || '8px 12px'};
                          font-size: {layout?.dropdown.item.fontSize || '12px'};
                          color: {theme?.dropdown.item.color || 'rgba(223, 208, 184, 0.8)'};
                          transition: {layout?.animation.hoverTransition || 'background-color 0.2s ease'};
                        "
                      >
                        <span class="model-name">{themeItem.name}</span>
                        <span class="model-id">{themeItem.id}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Status Indicator -->
      <div 
        class="green-indicator"
        style="
          width: {layout?.controlsRow.statusIndicator.size || '8px'};
          height: {layout?.controlsRow.statusIndicator.size || '8px'};
          background: {theme?.controlsRow.statusIndicator.color || '#00ff00'};
          box-shadow: {theme?.controlsRow.statusIndicator.shadow || '0 0 4px #00ff00, 0 0 8px rgba(0, 255, 0, 0.5)'};
        "
      ></div>
    </div>
  </div>
</div>

<style>
  .input-container {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
  }

  @media (min-width: 705px) {
    .input-container {
      width: 800px !important;
    }
    .left-stencil, .right-stencil {
      width: calc((100vw - 800px) / 2) !important;
    }
  }

  .input-bar {
    height: auto;
    display: grid;
    grid-template-rows: auto 1fr auto;
  }

  .file-preview-zone {
    display: flex;
    flex-wrap: wrap;
    grid-row: 1;
  }

  .file-preview {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .file-preview img {
    object-fit: cover;
  }

  .file-name {
    text-align: center;
    word-break: break-all;
    line-height: 1.2;
  }

  .remove-file {
    position: absolute;
    border-radius: 50%;
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
    background: var(--remove-button-hover, rgba(255, 0, 0, 1)) !important;
  }

  .text-input {
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    grid-row: 2;
    overflow-y: hidden;
    box-sizing: border-box;
  }

  .text-input::placeholder {
    color: rgba(223, 208, 184, 0.6);
  }

  .controls-row {
    display: flex;
    align-items: center;
    grid-row: 3;
  }

  .plus-button {
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .plus-button:hover {
    background: var(--hover-background, rgba(255, 255, 255, 0.1)) !important;
  }

  .plus-icon {
    position: relative;
    width: 10px;
    height: 10px;
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
    background: var(--hover-background, rgba(255, 255, 255, 0.1)) !important;
  }

  .chevron {
    width: 8px;
    height: 8px;
    border: 1.5px solid transparent;
    border-right-color: rgba(223, 208, 184, 0.5);
    border-bottom-color: rgba(223, 208, 184, 0.5);
    transform: rotate(45deg);
    margin-right: 6px;
    align-self: flex-start;
    background: transparent;
    box-sizing: border-box;
  }

  .chevron.up {
    border: 1.5px solid transparent;
    border-left-color: rgba(223, 208, 184, 0.5);
    border-top-color: rgba(223, 208, 184, 0.5);
    transform: rotate(45deg);
    align-self: flex-end;
    background: transparent;
    box-sizing: border-box;
  }

  .dropdown-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    max-height: 300px;
    overflow-y: auto;
    z-index: var(--dropdown-z-index, 1000);
  }

  .persona-menu {
    max-height: 400px;
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
    font-family: system-ui;
    text-align: left;
    cursor: pointer;
  }

  .dropdown-item:hover {
    background: var(--hover-background, rgba(255, 255, 255, 0.1)) !important;
  }

  .dropdown-item.selected {
    background: var(--selected-background, rgba(255, 255, 255, 0.15)) !important;
    color: var(--selected-text-color, rgba(223, 208, 184, 1)) !important;
  }

  .dropdown-item:first-child {
    border-radius: 8px 8px 0 0;
  }

  .dropdown-item:last-child {
    border-radius: 0 0 8px 8px;
  }

  .dropdown-section {
    margin-bottom: 8px;
  }

  .dropdown-section:last-child {
    margin-bottom: 0;
  }

  .section-header {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-content {
    /* Container for model items within each section */
  }

  .model-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px !important;
  }

  .model-name {
    font-size: 12px;
    font-weight: 500;
    flex-shrink: 0;
  }

  .model-id {
    font-size: 10px;
    opacity: 0.6;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    text-align: right;
    margin-left: 16px;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .green-indicator {
    border-radius: 50%;
    margin-left: auto;
  }

  .left-stencil {
    position: fixed;
    left: 0;
    will-change: opacity;
    backface-visibility: hidden;
  }

  .right-stencil {
    position: fixed;
    right: 0;
    will-change: opacity;
    backface-visibility: hidden;
  }
</style>