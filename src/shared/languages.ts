// Languages offered for dictation. 'auto' leaves the language hints unspecified.
export interface DictationLanguageOption {
  code: string;    // ISO-639-1; Chinese is sent as the zh-tw hint
  name: string;    // in English (the UI language)
  native: string;  // as its speakers write it
}

export const AUTO_LANGUAGE = 'auto';

export const DICTATION_LANGUAGES: DictationLanguageOption[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'zh', name: 'Chinese (Traditional)', native: '繁體中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
];

/** Normalize model language predictions to the codes used by our UI and history. */
export function normalizeLanguageCode(code: string | undefined): string | undefined {
  if (typeof code !== 'string' || !code.trim()) return undefined;
  const lower = code.trim().toLowerCase().replace('_', '-');
  if (['zh', 'cmn', 'yue'].includes(lower.split('-')[0])) return 'zh';
  return lower.split('-')[0];
}

/** Short label for a language code: "Auto-detect", "English", "繁體中文"… */
export function languageLabel(code: string | undefined): string {
  if (!code || code === AUTO_LANGUAGE) return 'Auto-detect';
  const lang = DICTATION_LANGUAGES.find(l => l.code === code);
  return lang ? (lang.name === lang.native ? lang.name : lang.native) : code.toUpperCase();
}
