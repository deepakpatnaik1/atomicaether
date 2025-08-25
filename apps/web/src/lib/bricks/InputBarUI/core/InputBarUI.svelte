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
        --dropdown-z-index: {layout?.dropdown.menu.zIndex};
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
    bottom: {layout?.stencils.positioning.bottom};
    height: {layout?.stencils.positioning.height};
    z-index: {layout?.stencils.positioning.zIndex};
    width: {layout?.stencils.dimensions.defaultWidth};
    min-width: {layout?.stencils.dimensions.minWidth};
    background: {theme?.stencils.gradient.left};
  "
></div>

<div 
  class="right-stencil"
  style="
    bottom: {layout?.stencils.positioning.bottom};
    height: {layout?.stencils.positioning.height};
    z-index: {layout?.stencils.positioning.zIndex};
    width: {layout?.stencils.dimensions.defaultWidth};
    min-width: {layout?.stencils.dimensions.minWidth};
    background: {theme?.stencils.gradient.right};
  "
></div>

<!-- Input Container -->
<div 
  class="input-container"
  style="
    bottom: {layout?.container.positioning.bottom};
    width: {layout?.container.dimensions.defaultWidth};
    max-width: {layout?.container.dimensions.maxWidth};
    z-index: {layout?.container.positioning.zIndex};
    opacity: {isReady ? '1' : '0'};
    transition: opacity 0.2s ease;
  "
>
  <!-- File Preview Zone - Outside Input Bar -->
  {#if files.length > 0}
    <div 
      class="file-preview-zone external"
      style="
        background: {theme?.filePreviewZone.background};
        border-radius: {theme?.filePreviewZone.border.radius};
        padding: {theme?.filePreviewZone.spacing.padding};
        border: 1px solid {theme?.filePreviewZone.border.color};
        gap: {theme?.filePreviewZone.spacing.itemGap};
        margin-bottom: {theme?.filePreviewZone.spacing.marginBottom};
        backdrop-filter: {theme?.inputBar.background.backdropFilter};
      "
    >
      {#each files as file, index}
        <div 
          class="file-preview"
          style="
            background: {theme?.filePreviewZone.filePreview.background};
            border-radius: {theme?.filePreviewZone.filePreview.borderRadius};
            padding: {theme?.filePreviewZone.filePreview.padding};
            min-width: {theme?.filePreviewZone.filePreview.minWidth};
            max-width: {theme?.filePreviewZone.filePreview.maxWidth};
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
                border-radius: {theme?.filePreviewZone.image.borderRadius};
                max-height: {theme?.filePreviewZone.image.maxHeight};
                opacity: {uploadProgress[index] < 100 ? theme?.filePreviewZone.image.uploadingOpacity : 1};
                object-fit: {theme?.filePreviewZone.image.objectFit};
              "
            />
          {:else}
            <div 
              class="file-icon"
              style="
                width: 100%;
                height: {theme?.filePreviewZone.fileIcon.height};
                display: flex;
                align-items: center;
                justify-content: center;
                background: {theme?.filePreviewZone.fileIcon.background};
                border-radius: {theme?.filePreviewZone.fileIcon.borderRadius};
                color: {theme?.filePreviewZone.fileIcon.color};
                font-size: {theme?.filePreviewZone.fileIcon.fontSize};
              "
            >📄</div>
          {/if}
          <span 
            class="file-name"
            style="
              display: block;
              margin-top: {theme?.filePreviewZone.fileName.marginTop};
              font-size: {theme?.filePreviewZone.fileName.fontSize};
              color: {theme?.filePreviewZone.fileName.color};
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
              width: {theme?.filePreviewZone.removeButton.size};
              height: {theme?.filePreviewZone.removeButton.size};
              top: {theme?.filePreviewZone.removeButton.position.top};
              right: {theme?.filePreviewZone.removeButton.position.right};
              background: {theme?.filePreviewZone.removeButton.background};
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
      min-height: {layout?.container.dimensions.minHeight};
      background: {theme?.inputBar.background.color};
      backdrop-filter: {theme?.inputBar.background.backdropFilter};
      border: {theme?.inputBar.border.width} {theme?.inputBar.border.style};
      border-image: linear-gradient(to bottom, {theme?.inputBar.border.gradientTop}, {theme?.inputBar.border.gradientBottom}) 1;
      border-radius: {theme?.inputBar.border.radius};
      box-shadow: {theme?.inputBar.shadow.outer}, {theme?.inputBar.shadow.inner};
      padding: {layout?.container.spacing.padding};
      gap: {layout?.container.spacing.gridGap};
      transition: {layout?.animation.globalTransition};
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
        color: {theme?.textInput.typography.color};
        font-size: {layout?.textInput.typography.fontSize};
        font-family: {layout?.textInput.typography.fontFamily};
        line-height: {layout?.textInput.autoResize.lineHeight};
        min-height: {layout?.textInput.autoResize.minHeight};
        max-height: {layout?.textInput.autoResize.maxHeight};
        transition: {layout?.animation.inputResize};
      "
    ></textarea>
    
    <!-- Controls Row -->
    <div 
      class="controls-row"
      style="gap: {layout?.controlsRow.layout.gap};"
    >
      <!-- Plus Button -->
      <button 
        class="plus-button" 
        onclick={handleFileSelect}
        aria-label="Attach files"
        style="
          padding: {layout?.controlsRow.plusButton.padding};
          border-radius: {layout?.controlsRow.plusButton.borderRadius};
          transition: {layout?.animation.hoverTransition};
        "
      >
        <div 
          class="plus-icon"
          style="
            width: {layout?.controlsRow.plusButton.icon.size};
            height: {layout?.controlsRow.plusButton.icon.size};
          "
        ></div>
      </button>
      
      <!-- Model Picker Dropdown -->
      <div class="dropdown-container">
        <button 
          class="dropdown-trigger" 
          onclick={toggleModelDropdown}
          style="
            font-size: {layout?.controlsRow.dropdownTrigger.fontSize};
            padding: {layout?.controlsRow.dropdownTrigger.padding};
            border-radius: {layout?.controlsRow.dropdownTrigger.borderRadius};
            color: {theme?.controlsRow.dropdownTrigger.color};
            transition: {layout?.animation.hoverTransition};
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
              width: {layout?.dropdown.menu.width};
              margin-bottom: {layout?.dropdown.menu.marginBottom};
              background: {theme?.dropdown.menu.background};
              backdrop-filter: {theme?.dropdown.menu.backdropFilter};
              border: {theme?.dropdown.menu.border};
              border-radius: {theme?.dropdown.menu.borderRadius};
              box-shadow: {theme?.dropdown.menu.shadow};
              animation: slideUp {layout?.animation.dropdownAnimation} ease;
            "
          >
            {#if dropdownData}
              {#each Object.entries(dropdownData.models).filter(([key]) => !key.startsWith('_')) as [category, models]}
                <div class="dropdown-section">
                  <div 
                    class="section-header"
                    style="
                      color: {theme?.dropdown.sectionHeader.color};
                      font-size: {layout?.dropdown.sectionHeader.fontSize};
                      padding: {layout?.dropdown.sectionHeader.padding};
                      border-bottom: {theme?.dropdown.sectionHeader.borderBottom};
                      margin-bottom: {layout?.dropdown.sectionHeader.marginBottom};
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
                          padding: {layout?.dropdown.item.padding};
                          font-size: {layout?.dropdown.item.fontSize};
                          color: {theme?.dropdown.item.color};
                          transition: {layout?.animation.hoverTransition};
                        "
                      >
                        <span 
                          class="model-name"
                          style="font-size: {layout?.dropdown.modelRow.modelName.fontSize};"
                        >
                          {model.name}
                        </span>
                        <span 
                          class="model-id"
                          style="
                            font-size: {layout?.dropdown.modelRow.modelId.fontSize};
                            margin-left: {layout?.dropdown.modelRow.modelId.marginLeft};
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
            font-size: {layout?.controlsRow.dropdownTrigger.fontSize};
            padding: {layout?.controlsRow.dropdownTrigger.padding};
            border-radius: {layout?.controlsRow.dropdownTrigger.borderRadius};
            color: {theme?.controlsRow.dropdownTrigger.color};
            transition: {layout?.animation.hoverTransition};
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
              width: {layout?.dropdown.menu.width};
              margin-bottom: {layout?.dropdown.menu.marginBottom};
              background: {theme?.dropdown.menu.background};
              backdrop-filter: {theme?.dropdown.menu.backdropFilter};
              border: {theme?.dropdown.menu.border};
              border-radius: {theme?.dropdown.menu.borderRadius};
              box-shadow: {theme?.dropdown.menu.shadow};
              animation: slideUp {layout?.animation.dropdownAnimation} ease;
            "
          >
            {#if dropdownData}
              {#each Object.entries(dropdownData.personas).filter(([key]) => !key.startsWith('_')) as [category, personas]}
                <div class="dropdown-section">
                  <div 
                    class="section-header"
                    style="
                      color: {theme?.dropdown.sectionHeader.color};
                      font-size: {layout?.dropdown.sectionHeader.fontSize};
                      padding: {layout?.dropdown.sectionHeader.padding};
                      border-bottom: {theme?.dropdown.sectionHeader.borderBottom};
                      margin-bottom: {layout?.dropdown.sectionHeader.marginBottom};
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
                          padding: {layout?.dropdown.item.padding};
                          font-size: {layout?.dropdown.item.fontSize};
                          color: {theme?.dropdown.item.color};
                          transition: {layout?.animation.hoverTransition};
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
            font-size: {layout?.controlsRow.dropdownTrigger.fontSize};
            padding: {layout?.controlsRow.dropdownTrigger.padding};
            border-radius: {layout?.controlsRow.dropdownTrigger.borderRadius};
            color: {theme?.controlsRow.dropdownTrigger.color};
            transition: {layout?.animation.hoverTransition};
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
              width: {layout?.dropdown.menu.width};
              margin-bottom: {layout?.dropdown.menu.marginBottom};
              background: {theme?.dropdown.menu.background};
              backdrop-filter: {theme?.dropdown.menu.backdropFilter};
              border: {theme?.dropdown.menu.border};
              border-radius: {theme?.dropdown.menu.borderRadius};
              box-shadow: {theme?.dropdown.menu.shadow};
              animation: slideUp {layout?.animation.dropdownAnimation} ease;
            "
          >
            {#if dropdownData}
              {#each Object.entries(dropdownData.themes).filter(([key]) => !key.startsWith('_')) as [category, themes]}
                <div class="dropdown-section">
                  <div 
                    class="section-header"
                    style="
                      color: {theme?.dropdown.sectionHeader.color};
                      font-size: {layout?.dropdown.sectionHeader.fontSize};
                      padding: {layout?.dropdown.sectionHeader.padding};
                      border-bottom: {theme?.dropdown.sectionHeader.borderBottom};
                      margin-bottom: {layout?.dropdown.sectionHeader.marginBottom};
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
                          padding: {layout?.dropdown.item.padding};
                          font-size: {layout?.dropdown.item.fontSize};
                          color: {theme?.dropdown.item.color};
                          transition: {layout?.animation.hoverTransition};
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
          width: {layout?.controlsRow.statusIndicator.size};
          height: {layout?.controlsRow.statusIndicator.size};
          background: {theme?.controlsRow.statusIndicator.color};
          box-shadow: {theme?.controlsRow.statusIndicator.shadow};
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
    border-radius: var(--file-preview-zone-remove-button-border-radius);
    color: var(--file-preview-zone-remove-button-color);
    border: none;
    cursor: pointer;
    font-size: var(--file-preview-zone-remove-button-font-size);
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
    color: var(--text-input-typography-placeholder-color);
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
    padding: var(--spacing-micro) var(--spacing-small);
    border-radius: var(--borders-radius-small);
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
    background: var(--controls-row-plus-button-icon-color);
  }

  .plus-icon::before {
    top: 50%;
    left: 0;
    width: 100%;
    height: var(--borders-width-subtle);
    transform: translateY(-50%);
  }

  .plus-icon::after {
    top: 0;
    left: 50%;
    width: var(--borders-width-subtle);
    height: 100%;
    transform: translateX(-50%);
  }

  .dropdown-container {
    position: relative;
  }

  .dropdown-trigger {
    background: transparent;
    border: none;
    color: var(--controls-row-dropdown-trigger-color);
    font-size: var(--typography-font-size-small);
    font-family: var(--typography-font-family-system);
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-micro);
    padding: var(--spacing-micro) var(--spacing-small);
    border-radius: var(--borders-radius-small);
    transition: var(--effects-transitions-quick);
  }

  .dropdown-trigger:hover {
    background: var(--hover-background, rgba(255, 255, 255, 0.1)) !important;
  }

  .chevron {
    width: var(--spacing-small);
    height: var(--spacing-small);
    border: var(--borders-width-subtle) solid transparent;
    border-right-color: var(--controls-row-dropdown-trigger-chevron-color);
    border-bottom-color: var(--controls-row-dropdown-trigger-chevron-color);
    transform: rotate(45deg);
    margin-right: var(--spacing-tiny);
    align-self: flex-start;
    background: transparent;
    box-sizing: border-box;
  }

  .chevron.up {
    border: var(--borders-width-subtle) solid transparent;
    border-left-color: var(--controls-row-dropdown-trigger-chevron-color);
    border-top-color: var(--controls-row-dropdown-trigger-chevron-color);
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
    font-family: var(--typography-font-family-system);
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
    border-radius: var(--borders-radius-medium) var(--borders-radius-medium) 0 0;
  }

  .dropdown-item:last-child {
    border-radius: 0 0 var(--borders-radius-medium) var(--borders-radius-medium);
  }

  .dropdown-section {
    margin-bottom: var(--spacing-small);
  }

  .dropdown-section:last-child {
    margin-bottom: 0;
  }

  .section-header {
    font-weight: var(--typography-font-weight-bold);
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
    padding: var(--spacing-small) var(--spacing-compact) !important;
  }

  .model-name {
    font-size: var(--typography-font-size-small);
    font-weight: var(--typography-font-weight-medium);
    flex-shrink: 0;
  }

  .model-id {
    font-size: var(--typography-font-size-tiny);
    opacity: var(--effects-opacity-muted);
    font-family: var(--typography-font-family-mono);
    text-align: right;
    margin-left: var(--spacing-medium);
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