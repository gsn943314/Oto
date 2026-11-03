// Shared types between main and renderer processes

/** The key that starts and stops dictation from any app, by tapping it alone */
export type TriggerKey = 'control' | 'fn' | 'rightOption' | 'off';

/** What happened to a finished transcript: typed into the focused field, or left on the clipboard */
export type PasteResult = 'pasted' | 'noField' | 'ownWindow' | 'disabled' | 'failed';

/** The floating pill shown over other apps while dictating */
export type OverlayState =
  | { kind: 'hidden' }
  | { kind: 'recording'; level: number; seconds: number }
  | { kind: 'thinking' }
  | { kind: 'pasted'; app?: string }
  | { kind: 'copied' }
  | { kind: 'error'; label: string };

export interface AppSettings {
  apiKey: string;
  dictationLanguage: string;  // 'auto' (the model detects it) or an ISO-639-1 code, see shared/languages.ts
  uiLanguage: 'zh' | 'en';  // 介面語言（目前固定英文）
  windowOpacity: number;
  historyLimit: number;
  openDevTools?: boolean;  // 開發者工具（僅開發模式）
  triggerKey: TriggerKey;  // 在任何 App 單按即可開始 / 停止錄音
  autoPaste: boolean;      // 轉好後自動貼到游標所在的輸入框
  pointerBadge: boolean;   // 錄音、轉換時在滑鼠旁顯示狀態
}

export interface TranscriptionRequest {
  audioBlob: Buffer | number[];  // Support both Buffer (main process) and number[] (renderer process)
  language?: string;
}

export interface TranscriptionResponse {
  text: string;
  success: boolean;
  language?: string;  // the language the model heard, as an ISO-639-1 code
  error?: string;
  errorType?: ErrorType;
}

export interface TranscriptionHistory {
  id: string;
  text: string;
  timestamp: number;
  language: string;
  duration: number;
}

export enum ErrorType {
  MICROPHONE_ACCESS_DENIED = 'MICROPHONE_ACCESS_DENIED',
  API_KEY_INVALID = 'API_KEY_INVALID',
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUDIO_RECORDING_FAILED = 'AUDIO_RECORDING_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
}
