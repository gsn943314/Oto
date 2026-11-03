// 國際化翻譯
import { ErrorType } from './types';

export type Language = 'zh' | 'en';

// What the window says about a failure: a word for the status line, then the notice's title and explanation
export interface ErrorCopy {
  status: string;
  title: string;
  body: string;
}

export interface Translations {
  // App Title
  appTitle: string;
  
  // Recording Control
  startRecording: string;
  stopRecording: string;
  recording: string;
  processing: string;
  
  // Text Display
  transcribedText: string;
  noTextYet: string;
  copyToClipboard: string;
  copied: string;
  
  // History
  history: string;
  noHistory: string;
  clearHistory: string;
  timeAgo: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
  
  // Settings
  settings: string;
  openAIApiKey: string;
  apiKeyPlaceholder: string;
  defaultLanguage: string;
  uiLanguage: string;
  chinese: string;
  english: string;
  windowOpacity: string;
  historyLimit: string;
  save: string;
  cancel: string;
  saving: string;
  
  // Errors
  errors: {
    apiKeyInvalid: string;
    apiKeyTooShort: string;
    opacityRange: string;
    historyLimitRange: string;
    saveFailed: string;
    microphoneAccessDenied: string;
    recordingFailed: string;
    transcriptionFailed: string;
  };
  
  // Status
  status: {
    ready: string;
    recording: string;
    processing: string;
    done: string;
    error: string;
  };

  // Layout
  nav: { transcribe: string; history: string };
  emptyTitle: string;
  emptyHint: string;
  characters: string;
  clear: string;
  copy: string;
  close: string;
  minimize: string;
  holdOn: string;
  clearHistoryConfirm: string;
  useThis: string;
  sections: { account: string; language: string; window: string };
  getApiKey: string;

  // Dictation language
  dictation: { label: string; auto: string; autoHint: string; pinnedHint: string };

  // Dictation from any app
  overlay: { thinking: string; pasted: string; pastedInto: string; copied: string; copiedAfter: string };
  delivered: { pasted: string; copied: string };
  anywhere: {
    section: string;
    trigger: string;
    triggerHint: string;
    fnHint: string;
    off: string;
    rightOption: string;
    autoPaste: string;
    autoPasteHint: string;
    pointerBadge: string;
    pointerBadgeHint: string;
    permission: string;
    permissionMissing: string;
    permissionGranted: string;
    grant: string;
    granting: string;
    tapToTalk: string;
  };

  // Failures and what to do about them
  errorCopy: Record<ErrorType, ErrorCopy>;
  actions: {
    retry: string;
    dismiss: string;
    openSettings: string;
    topUp: string;
    openSystemSettings: string;
  };
}

export const translations: Record<Language, Translations> = {
  zh: {
    appTitle: 'Oto',
    
    startRecording: '開始錄音',
    stopRecording: '停止錄音',
    recording: '錄音中',
    processing: '處理中',
    
    transcribedText: '轉錄文字',
    noTextYet: '尚無轉錄文字',
    copyToClipboard: '複製到剪貼簿',
    copied: '已複製',
    
    history: '歷史記錄',
    noHistory: '尚無歷史記錄',
    clearHistory: '清空',
    timeAgo: {
      justNow: '剛剛',
      minutesAgo: '分鐘前',
      hoursAgo: '小時前',
      daysAgo: '天前',
    },
    
    settings: '設定',
    openAIApiKey: 'OpenAI API 金鑰',
    apiKeyPlaceholder: 'sk-...',
    defaultLanguage: '預設語言',
    uiLanguage: '介面語言',
    chinese: '中文',
    english: 'English',
    windowOpacity: '視窗透明度',
    historyLimit: '歷史記錄數量限制',
    save: '儲存',
    cancel: '取消',
    saving: '儲存中...',
    
    errors: {
      apiKeyInvalid: 'API 金鑰格式無效（應以 sk- 開頭）',
      apiKeyTooShort: 'API 金鑰長度不足',
      opacityRange: '視窗透明度必須在 50% 到 100% 之間',
      historyLimitRange: '歷史記錄數量必須在 1 到 100 之間',
      saveFailed: '儲存設定失敗',
      microphoneAccessDenied: '麥克風存取被拒絕',
      recordingFailed: '錄音失敗',
      transcriptionFailed: '轉錄失敗',
    },
    
    status: {
      ready: '就緒',
      recording: '錄音中',
      processing: '處理中',
      done: '完成',
      error: '錯誤',
    },

    nav: { transcribe: '轉錄', history: '歷史' },
    emptyTitle: '按一下，開始說話。',
    emptyHint: '轉好的文字會出現在這裡，可以直接複製。',
    characters: '字',
    clear: '清除',
    copy: '複製',
    close: '關閉',
    minimize: '最小化',
    holdOn: '正在轉換語音…',
    clearHistoryConfirm: '再按一次清空',
    useThis: '放回轉錄區',
    sections: { account: 'OpenAI', language: '語言', window: '視窗' },
    getApiKey: '到 OpenAI 取得 API 金鑰',

    dictation: {
      label: '辨識語言',
      auto: '自動偵測',
      autoHint: 'GPT Transcribe 會自己判斷你說的語言；中文一律輸出繁體。',
      pinnedHint: '只說這個語言時，指定它會更準一些。',
    },
    overlay: { thinking: 'Thinking…', pasted: '已貼上', pastedInto: '已貼到 {app}', copied: '已複製，按', copiedAfter: '貼上' },
    delivered: { pasted: '已貼到 {app}，也存在剪貼簿', copied: '已複製到剪貼簿' },
    anywhere: {
      section: '在任何 App 說話',
      trigger: '觸發鍵',
      triggerHint: '單按一下開始錄音，再按一下就轉成文字。按著不放或搭配其他鍵時不會觸發。',
      fnHint: '若按 fn 會跳出表情符號，請到「系統設定 › 鍵盤」把「按下 🌐 鍵時」改成「不執行任何動作」。',
      off: '關閉',
      rightOption: '右 ⌥',
      autoPaste: '自動貼到游標處',
      autoPasteHint: '轉好的文字一律會存進剪貼簿；游標在輸入框時會直接貼上。',
      pointerBadge: '在滑鼠旁顯示狀態',
      pointerBadgeHint: '錄音和轉換時，滑鼠旁會跟著一個小泡泡。',
      permission: '輔助使用權限',
      permissionMissing: '尚未授權：要偵測按鍵、自動貼上，需要允許 Oto。',
      permissionGranted: '已授權',
      grant: '前往授權',
      granting: '已開啟系統設定，打開 Oto 的開關後會自動生效',
      tapToTalk: '在任何 App 按 {key} 說話',
    },

    errorCopy: {
      [ErrorType.INSUFFICIENT_QUOTA]: {
        status: '餘額不足',
        title: 'OpenAI 餘額用完了',
        body: 'Credit balance 已經是 $0。儲值後就能繼續用，金鑰不用換；剛才的錄音還在，可以直接重試。',
      },
      [ErrorType.API_KEY_INVALID]: {
        status: '金鑰無效',
        title: 'API 金鑰無法使用',
        body: 'OpenAI 拒絕了這把金鑰，可能已被撤銷或輸入有誤。請到設定換一把新的。',
      },
      [ErrorType.RATE_LIMITED]: {
        status: '請求過多',
        title: '請求太頻繁了',
        body: 'OpenAI 暫時限制了請求次數，稍等幾秒再重試。',
      },
      [ErrorType.TIMEOUT]: {
        status: '逾時',
        title: 'OpenAI 沒有回應',
        body: '等了 60 秒仍沒有結果，可能是 OpenAI 那邊忙碌。錄音還在，可以重試。',
      },
      [ErrorType.NETWORK_ERROR]: {
        status: '網路中斷',
        title: '連不上 OpenAI',
        body: '請確認網路連線後再重試，錄音不會遺失。',
      },
      [ErrorType.MICROPHONE_ACCESS_DENIED]: {
        status: '無法收音',
        title: '沒有麥克風權限',
        body: '請到「系統設定 › 隱私權與安全性 › 麥克風」允許 Oto。',
      },
      [ErrorType.AUDIO_RECORDING_FAILED]: {
        status: '錄音失敗',
        title: '這次沒有錄到聲音',
        body: '請確認麥克風已連接，再錄一次。',
      },
      [ErrorType.API_REQUEST_FAILED]: {
        status: '轉錄失敗',
        title: '轉錄沒有成功',
        body: 'OpenAI 回傳了錯誤，請稍後重試。',
      },
      [ErrorType.UNKNOWN_ERROR]: {
        status: '錯誤',
        title: '發生了未預期的錯誤',
        body: '請再試一次；如果持續發生，重新開啟 App。',
      },
    },
    actions: {
      retry: '重試',
      dismiss: '關閉',
      openSettings: '開啟設定',
      topUp: '前往儲值',
      openSystemSettings: '開啟系統設定',
    },
  },
  
  en: {
    appTitle: 'Voice Input Assistant',
    
    startRecording: 'Start recording',
    stopRecording: 'Stop recording',
    recording: 'Recording',
    processing: 'Processing',
    
    transcribedText: 'Transcribed text',
    noTextYet: 'No text yet',
    copyToClipboard: 'Copy to clipboard',
    copied: 'Copied',
    
    history: 'History',
    noHistory: 'No history yet',
    clearHistory: 'Clear',
    timeAgo: {
      justNow: 'Just now',
      minutesAgo: 'minutes ago',
      hoursAgo: 'hours ago',
      daysAgo: 'days ago',
    },
    
    settings: 'Settings',
    openAIApiKey: 'OpenAI API key',
    apiKeyPlaceholder: 'sk-...',
    defaultLanguage: 'Default Language',
    uiLanguage: 'UI Language',
    chinese: '中文',
    english: 'English',
    windowOpacity: 'Window opacity',
    historyLimit: 'History limit',
    save: 'Save',
    cancel: 'Cancel',
    saving: 'Saving...',
    
    errors: {
      apiKeyInvalid: 'Invalid API key format (should start with sk-)',
      apiKeyTooShort: 'API key is too short',
      opacityRange: 'Opacity must be between 50% and 100%',
      historyLimitRange: 'History limit must be between 1 and 100',
      saveFailed: 'Failed to save settings',
      microphoneAccessDenied: 'Microphone access denied',
      recordingFailed: 'Recording failed',
      transcriptionFailed: 'Transcription failed',
    },
    
    status: {
      ready: 'Ready',
      recording: 'Recording',
      processing: 'Processing',
      done: 'Done',
      error: 'Error',
    },

    nav: { transcribe: 'Transcribe', history: 'History' },
    emptyTitle: 'Tap, then talk.',
    emptyHint: 'Your words land here, ready to copy.',
    characters: 'chars',
    clear: 'Clear',
    copy: 'Copy',
    close: 'Close',
    minimize: 'Minimize',
    holdOn: 'Converting speech…',
    clearHistoryConfirm: 'Click again to clear',
    useThis: 'Use this text',
    sections: { account: 'OpenAI', language: 'Language', window: 'Window' },
    getApiKey: 'Get an API key from OpenAI',

    dictation: {
      label: 'Dictation language',
      auto: 'Auto-detect',
      autoHint: 'GPT Transcribe works out which language you speak. Chinese always comes out in Traditional characters.',
      pinnedHint: 'Pinning the language is a little more accurate when you only speak that one.',
    },
    overlay: { thinking: 'Thinking…', pasted: 'Pasted', pastedInto: 'Pasted into {app}', copied: 'Copied — press', copiedAfter: 'to paste' },
    delivered: { pasted: 'Pasted into {app}, and on the clipboard', copied: 'Copied to the clipboard' },
    anywhere: {
      section: 'Dictate anywhere',
      trigger: 'Trigger key',
      triggerHint: 'Tap once to start, tap again to turn it into text. Holding it or using it in a combination does nothing.',
      fnHint: 'If fn opens the emoji picker, set System Settings › Keyboard › “Press 🌐 key to” to “Do Nothing”.',
      off: 'Off',
      rightOption: 'Right ⌥',
      autoPaste: 'Paste where the cursor is',
      autoPasteHint: 'The text always goes on the clipboard; when a text field has focus it is pasted in too.',
      pointerBadge: 'Show status by the pointer',
      pointerBadgeHint: 'A small bubble follows the mouse while recording and transcribing.',
      permission: 'Accessibility permission',
      permissionMissing: 'Not granted: Oto needs it to notice the key and paste.',
      permissionGranted: 'Granted',
      grant: 'Grant access',
      granting: 'System Settings is open — switch Oto on and it takes effect by itself',
      tapToTalk: 'Tap {key} in any app to talk',
    },

    errorCopy: {
      [ErrorType.INSUFFICIENT_QUOTA]: {
        status: 'Out of credit',
        title: 'Your OpenAI balance ran out',
        body: 'The credit balance is $0. Top up and the same key works again; your last recording is kept, so you can retry.',
      },
      [ErrorType.API_KEY_INVALID]: {
        status: 'Key rejected',
        title: 'The API key doesn\'t work',
        body: 'OpenAI turned this key down; it may have been revoked or mistyped. Add a new one in Settings.',
      },
      [ErrorType.RATE_LIMITED]: {
        status: 'Rate limited',
        title: 'Too many requests',
        body: 'OpenAI is limiting requests for a moment. Wait a few seconds and retry.',
      },
      [ErrorType.TIMEOUT]: {
        status: 'Timed out',
        title: 'OpenAI didn\'t answer',
        body: 'Nothing came back within 60 seconds; OpenAI may be busy. Your recording is kept, so you can retry.',
      },
      [ErrorType.NETWORK_ERROR]: {
        status: 'Offline',
        title: 'Can\'t reach OpenAI',
        body: 'Check your connection and retry. The recording isn\'t lost.',
      },
      [ErrorType.MICROPHONE_ACCESS_DENIED]: {
        status: 'No microphone',
        title: 'Microphone access is off',
        body: 'Allow Oto in System Settings › Privacy & Security › Microphone.',
      },
      [ErrorType.AUDIO_RECORDING_FAILED]: {
        status: 'Recording failed',
        title: 'Nothing was recorded',
        body: 'Check that a microphone is connected and record again.',
      },
      [ErrorType.API_REQUEST_FAILED]: {
        status: 'Failed',
        title: 'Transcription failed',
        body: 'OpenAI returned an error. Try again in a moment.',
      },
      [ErrorType.UNKNOWN_ERROR]: {
        status: 'Error',
        title: 'Something unexpected happened',
        body: 'Try again; if it keeps happening, restart the app.',
      },
    },
    actions: {
      retry: 'Retry',
      dismiss: 'Dismiss',
      openSettings: 'Open Settings',
      topUp: 'Add credit',
      openSystemSettings: 'Open System Settings',
    },
  },
};

export function getTranslations(language: Language): Translations {
  return translations[language] || translations.zh;
}
