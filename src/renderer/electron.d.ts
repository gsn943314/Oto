import type { TranscriptionRequest, TranscriptionResponse, AppSettings, TranscriptionHistory, OverlayState, PasteResult } from '../shared/types';

export interface ElectronAPI {
  transcribeAudio: (request: TranscriptionRequest) => Promise<TranscriptionResponse>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  loadSettings: () => Promise<AppSettings>;
  copyToClipboard: (text: string) => Promise<boolean>;
  loadHistory: () => Promise<TranscriptionHistory[]>;
  saveHistory: (history: TranscriptionHistory[]) => Promise<void>;
  clearHistory: () => Promise<void>;
  openSystemPreferences: () => Promise<void>;
  minimizeWindow: () => void;
  closeWindow: () => void;
  setWindowOpacity: (opacity: number) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  onHotkeyToggle: (callback: () => void) => () => void;
  setOverlayState: (state: OverlayState) => void;
  showWindow: () => void;
  onOverlayState: (callback: (state: OverlayState) => void) => () => void;
  deliverText: (text: string) => Promise<{ result: PasteResult; app?: string }>;
  getAccessibilityStatus: () => Promise<boolean>;
  requestAccessibility: () => Promise<void>;
  onAccessibilityChange: (callback: (trusted: boolean) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: ElectronAPI; // Alias for compatibility
  }
}
