export interface ThemePickerProps {
  disabled?: boolean;
  compact?: boolean;
  placeholder?: string;
}

export interface ThemePickerEvents {
  themeSelected: { theme: string };
  dropdownToggled: { open: boolean };
}