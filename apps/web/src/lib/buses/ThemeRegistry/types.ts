export interface Theme {
  name: string;
  appBackground: string;
  // Will grow organically as we discover needed properties
}

export interface ThemeMap {
  [key: string]: Theme;
}