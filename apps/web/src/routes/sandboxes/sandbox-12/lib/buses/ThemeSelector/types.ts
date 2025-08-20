export interface ThemeSelection {
  current: string | null;
  available: string[];
}

export interface ThemeChangedEvent {
  name: string;
  theme: any;
}