export interface InputBarConfig {
  container: {
    positioning: {
      bottom: string;
      zIndex: string;
    };
    dimensions: {
      defaultWidth: string;
      largeScreenWidth: string;
      maxWidth: string;
      minHeight: string;
      breakpoint: string;
    };
    spacing: {
      padding: string;
      gridGap: string;
    };
  };
  filePreviewZone: {
    spacing: {
      padding: string;
      itemGap: string;
    };
    filePreview: {
      padding: string;
      minWidth: string;
      maxWidth: string;
      imageSize: string;
      imageBorderRadius: string;
    };
    removeButton: {
      size: string;
      position: {
        top: string;
        right: string;
      };
    };
  };
  textInput: {
    autoResize: {
      lineHeight: string;
      minHeight: string;
      maxHeight: string;
      maxLines: number;
    };
    typography: {
      fontSize: string;
      fontFamily: string;
    };
  };
  controlsRow: {
    layout: {
      gap: string;
    };
    plusButton: {
      padding: string;
      borderRadius: string;
      icon: {
        size: string;
      };
    };
    dropdownTrigger: {
      fontSize: string;
      padding: string;
      borderRadius: string;
      chevron: {
        size: string;
        marginRight: string;
      };
    };
    statusIndicator: {
      size: string;
    };
  };
  dropdown: {
    menu: {
      width: string;
      marginBottom: string;
    };
    item: {
      padding: string;
      fontSize: string;
    };
    sectionHeader: {
      padding: string;
      fontSize: string;
      marginBottom: string;
    };
    modelRow: {
      modelName: {
        fontSize: string;
      };
      modelId: {
        fontSize: string;
        marginLeft: string;
      };
    };
  };
  stencils: {
    positioning: {
      bottom: string;
      height: string;
      zIndex: string;
    };
    dimensions: {
      defaultWidth: string;
      largeWidth: string;
      minWidth: string;
    };
  };
  animation: {
    inputResize: string;
    hoverTransition: string;
    globalTransition: string;
    dropdownAnimation: string;
  };
}

export interface InputBarBehavior {
  autoResize: {
    lineHeight: number;
    minLines: number;
    maxLines: number;
    minHeight: number;
    maxHeight: number;
    animationDuration: string;
  };
  keyboardShortcuts: {
    escapeKey: {
      clearFiles: boolean;
      clearText: boolean;
      resetHeight: boolean;
    };
  };
  fileHandling: {
    dragAndDrop: {
      enabled: boolean;
      preventDefaultBehavior: boolean;
    };
    filePreview: {
      imagePreviewEnabled: boolean;
      maxImageSize: string;
      fallbackIcon: string;
    };
    removeButton: {
      showOnHover: boolean;
      confirmRemoval: boolean;
    };
  };
  dropdownBehavior: {
    clickOutsideToClose: {
      enabled: boolean;
    };
    exclusiveDropdowns: {
      enabled: boolean;
    };
    animation: {
      duration: string;
      easing: string;
      slideDirection: string;
    };
  };
}

export interface DropdownData {
  models: Record<string, Array<{ name: string; id: string }>>;
  personas: Record<string, Array<{ name: string; id: string }>>;
  themes: Record<string, Array<{ name: string; id: string }>>;
  defaults: {
    selectedModel: string;
    selectedPersona: string;
    selectedTheme: string;
  };
}

export interface RainyNightTheme {
  name: string;
  inputBar: {
    background: {
      color: string;
      backdropFilter: string;
    };
    border: {
      width: string;
      style: string;
      gradientTop: string;
      gradientBottom: string;
      radius: string;
    };
    shadow: {
      outer: string;
      inner: string;
    };
  };
  filePreviewZone: {
    background: string;
    border: {
      color: string;
      radius: string;
    };
    filePreview: {
      background: string;
      borderRadius: string;
    };
    removeButton: {
      background: string;
      backgroundHover: string;
    };
  };
  textInput: {
    typography: {
      color: string;
      placeholderColor: string;
    };
  };
  controlsRow: {
    plusButton: {
      icon: {
        color: string;
      };
      backgroundHover: string;
    };
    dropdownTrigger: {
      color: string;
      backgroundHover: string;
      chevron: {
        color: string;
      };
    };
    statusIndicator: {
      color: string;
      shadow: string;
    };
  };
  dropdown: {
    menu: {
      background: string;
      backdropFilter: string;
      border: string;
      borderRadius: string;
      shadow: string;
    };
    item: {
      color: string;
      backgroundHover: string;
      backgroundSelected: string;
      colorSelected: string;
    };
    sectionHeader: {
      color: string;
      borderBottom: string;
    };
  };
  stencils: {
    gradient: {
      left: string;
      right: string;
    };
  };
  navigation: {
    link: {
      color: string;
    };
    tagline: {
      color: string;
    };
  };
  globalBody: {
    background: string;
    color: string;
    transition: string;
  };
}

export interface FallbackMappings {
  models: Record<string, string>;
  personas: Record<string, string>;
  themes: Record<string, string>;
}

export interface BTTConfig {
  mockCanvas: {
    screenshot: {
      width: number;
      height: number;
      backgroundColor: string;
      textColor: string;
      fontSize: string;
      fontFamily: string;
    };
    scrollingScreenshot: {
      width: number;
      height: number;
      backgroundColor: string;
      textColor: string;
      fontSize: string;
      fontFamily: string;
      contentSections: number;
      sectionSpacing: number;
    };
  };
  debugMessages: {
    textCapture: string;
    imageCapture: string;
    textCapturedViaUrl: string;
    fileCapturedViaUrl: string;
    urlCapturedViaBrowser: string;
    scrollingScreenshotCaptured: string;
  };
  mockFileContent: {
    finderFilePrefix: string;
    urlFromBrowserPrefix: string;
    scrollingScreenshotText: string;
    screenshotText: string;
    placeholderSuffix: string;
  };
}