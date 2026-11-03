// IPC channel names
export const IPC_CHANNELS = {
  TRANSCRIBE_AUDIO: 'transcribe-audio',
  SAVE_SETTINGS: 'save-settings',
  LOAD_SETTINGS: 'load-settings',
  COPY_TO_CLIPBOARD: 'copy-to-clipboard',
  LOAD_HISTORY: 'load-history',
  SAVE_HISTORY: 'save-history',
  CLEAR_HISTORY: 'clear-history',
  OPEN_SYSTEM_PREFERENCES: 'open-system-preferences',
  MINIMIZE_WINDOW: 'minimize-window',
  CLOSE_WINDOW: 'close-window',
  SET_WINDOW_OPACITY: 'set-window-opacity',
  OPEN_EXTERNAL: 'open-external',
  HOTKEY_TOGGLE: 'hotkey-toggle',
  SHOW_WINDOW: 'show-window',
  OVERLAY_STATE: 'overlay-state',
  DELIVER_TEXT: 'deliver-text',
  ACCESSIBILITY_STATUS: 'accessibility-status',
  ACCESSIBILITY_REQUEST: 'accessibility-request',
  ACCESSIBILITY_CHANGED: 'accessibility-changed',
} as const;

// Pages the renderer may open in the browser (anything else is refused)
export const EXTERNAL_LINKS = {
  OPENAI_BILLING: 'https://platform.openai.com/settings/organization/billing/overview',
  OPENAI_API_KEYS: 'https://platform.openai.com/api-keys',
  OPENAI_USAGE: 'https://platform.openai.com/usage',
  ACCESSIBILITY_SETTINGS: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  apiKey: '',
  dictationLanguage: 'auto',
  uiLanguage: 'en' as const,  // the interface is English for now
  windowOpacity: 1.0,
  historyLimit: 50,
  openDevTools: false,  // 默認不開啟開發者工具
  triggerKey: 'control' as const,
  autoPaste: true,
  pointerBadge: true,
};
