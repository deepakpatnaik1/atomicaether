export interface TextHandlerConfig {
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
      clearText: boolean;
      resetHeight: boolean;
    };
  };
  textarea: {
    placeholder: string;
    initialRows: number;
  };
}

export interface TextHandlerTheme {
  textarea: {
    color: string;
    fontSize: string;
    fontFamily: string;
    lineHeight: string;
    placeholderColor: string;
    transition: string;
    background: string;
    border: string;
    outline: string;
    resize: string;
    overflowY: string;
    boxSizing: string;
  };
}

export interface TextHandlerAPI {
  // Text content
  text: string;
  setText(value: string): void;
  clearText(): void;
  
  // Height management
  autoResize(): void;
  resetHeight(): void;
  getCurrentHeight(): number;
  
  // State queries
  isAtMaxHeight(): boolean;
  getLineCount(): number;
  
  // Events
  onTextChange?: (text: string) => void;
  onHeightChange?: (height: number) => void;
}

export interface TextHandlerEvent {
  textChange: { text: string };
  heightChange: { height: number; lineCount: number };
  escape: { clearedText: boolean; resetHeight: boolean };
}