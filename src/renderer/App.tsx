/// <reference path="./electron.d.ts" />
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { TranscriptionHistory, AppError, TranscriptionResponse, AppSettings, OverlayState } from '../shared/types';
import { ErrorType } from '../shared/types';
import { EXTERNAL_LINKS } from '../shared/constants';
import { AUTO_LANGUAGE } from '../shared/languages';
import { AudioRecorder } from './services/AudioRecorder';
import { RecordingControl } from './components/RecordingControl';
import { TextDisplay } from './components/TextDisplay';
import { StatusIndicator } from './components/StatusIndicator';
import { HistoryList } from './components/HistoryList';
import { Settings } from './components/Settings';
import ErrorDisplay, { type NoticeAction } from './components/ErrorDisplay';
import { Toast } from './components/Toast';
import { TitleBar, type View } from './components/TitleBar';
import { errorHandler } from '../shared/errorHandler';
import { getTranslations, type Language, type Translations } from '../shared/i18n';

export interface AppState {
  isRecording: boolean;
  isProcessing: boolean;
  transcribedText: string;
  error: AppError | null;
  history: TranscriptionHistory[];
  recordingDuration: number;
  uiLanguage: Language;
  t: Translations;
}

interface AppContextValue extends AppState {
  setIsRecording: (value: boolean) => void;
  setIsProcessing: (value: boolean) => void;
  setTranscribedText: (text: string) => void;
  setError: (error: AppError | null) => void;
  addToHistory: (item: TranscriptionHistory) => void;
  clearHistory: () => void;
  setRecordingDuration: (duration: number) => void;
  setUILanguage: (language: Language) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Failures where sending the same recording again can work
const RETRYABLE = new Set([
  ErrorType.INSUFFICIENT_QUOTA, ErrorType.RATE_LIMITED, ErrorType.TIMEOUT,
  ErrorType.NETWORK_ERROR, ErrorType.API_REQUEST_FAILED, ErrorType.UNKNOWN_ERROR,
]);

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<AppError | null>(null);
  const [history, setHistory] = useState<TranscriptionHistory[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [view, setView] = useState<View>('transcribe');
  const [toast, setToast] = useState<string | null>(null);
  const [trusted, setTrusted] = useState<boolean | null>(null);
  const [granting, setGranting] = useState(false);

  // the interface is English for now (the Chinese strings stay in i18n for later)
  const [uiLanguage, setUILanguage] = useState<Language>('en');
  const t = getTranslations(uiLanguage);
  useEffect(() => { document.documentElement.lang = uiLanguage === 'zh' ? 'zh-TW' : 'en'; }, [uiLanguage]);

  const audioRecorderRef = useRef<AudioRecorder>(new AudioRecorder());
  // the last recording that didn't make it through, so it can be sent again (after a top-up, say)
  const pendingAudioRef = useRef<{ blob: Blob; duration: number } | null>(null);
  const historyLoadedRef = useRef(false);

  useEffect(() => {
    const recorder = audioRecorderRef.current;
    return () => recorder.dispose();
  }, []);

  useEffect(() => {
    window.electronAPI.loadHistory()
      .then(setHistory)
      .catch(err => console.error('Failed to load history:', err))
      .finally(() => { historyLoadedRef.current = true; });

    window.electronAPI.loadSettings()
      .then(loaded => {
        setSettings(loaded);
      })
      .catch(err => console.error('Failed to load settings:', err));
  }, []);

  // dictating from other apps needs Accessibility permission; the window says so until it's granted
  useEffect(() => {
    window.electronAPI.getAccessibilityStatus().then(setTrusted).catch(() => {});
    return window.electronAPI.onAccessibilityChange(setTrusted);
  }, []);

  // keep the history on disk (not before it has been read, or the saved one would be overwritten)
  useEffect(() => {
    if (!historyLoadedRef.current) return;
    window.electronAPI.saveHistory(history).catch(err => console.error('Failed to save history:', err));
  }, [history]);

  const historyLimit = settings?.historyLimit ?? 50;
  const addToHistory = useCallback((item: TranscriptionHistory) => {
    setHistory(prev => [item, ...prev].slice(0, historyLimit));
  }, [historyLimit]);

  const showToast = useCallback((message: string) => setToast(message), []);

  const copyText = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await window.electronAPI.copyToClipboard(text);
      showToast(t.copied);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [showToast, t]);

  const clearHistory = useCallback(async () => {
    try {
      await window.electronAPI.clearHistory();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, []);

  const transcribe = useCallback(async (audioBlob: Blob, duration: number, viaHotkey = false) => {
    const overlay = (state: OverlayState) => { if (viaHotkey) window.electronAPI.setOverlayState(state); };
    overlay({ kind: 'thinking' });
    setIsProcessing(true);
    setError(null);
    setView('transcribe');
    pendingAudioRef.current = { blob: audioBlob, duration };

    try {
      const audioData = Array.from(new Uint8Array(await audioBlob.arrayBuffer()));
      const chosen = settings?.dictationLanguage || AUTO_LANGUAGE;
      const response: TranscriptionResponse = await window.electronAPI.transcribeAudio({
        audioBlob: audioData,
        language: chosen === AUTO_LANGUAGE ? undefined : chosen,
      });
      const language = response.language ?? chosen;

      if (response.success && response.text) {
        pendingAudioRef.current = null;
        setTranscribedText(response.text); // a new recording replaces the last one
        addToHistory({ id: Date.now().toString(), text: response.text, timestamp: Date.now(), language, duration });

        // onto the clipboard, and into the field the cursor is in (unless that's this window)
        const { result, app } = await window.electronAPI.deliverText(response.text);
        if (result === 'pasted') {
          overlay({ kind: 'pasted', app });
          showToast(t.delivered.pasted.replace('{app}', app || '…'));
        } else {
          overlay(result === 'ownWindow' ? { kind: 'hidden' } : { kind: 'copied' });
          showToast(t.delivered.copied);
        }
      } else if (response.success) {
        pendingAudioRef.current = null; // silence: nothing to add, nothing to retry
        overlay({ kind: 'hidden' });
      } else {
        const type = response.errorType ?? ErrorType.API_REQUEST_FAILED;
        setError(errorHandler.createError(type, response.error || 'Transcription failed'));
        overlay({ kind: 'error', label: t.errorCopy[type]?.status ?? t.status.error });
        // the window is where the explanation and the buttons are
        if (viaHotkey) window.electronAPI.showWindow();
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError(errorHandler.handleUnknownError(err));
      overlay({ kind: 'error', label: t.status.error });
    } finally {
      setIsProcessing(false);
    }
  }, [addToHistory, settings, showToast, t]);

  const handleSelectHistoryItem = useCallback((item: TranscriptionHistory) => {
    setTranscribedText(item.text);
    setView('transcribe');
  }, []);

  const handleSaveSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      await window.electronAPI.saveSettings(newSettings);
      setSettings(newSettings);
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: newSettings }));
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(errorHandler.handleUnknownError(err));
      throw err;
    }
  }, []);

  // what the notice offers for each kind of failure
  const noticeActions = (err: AppError): NoticeAction[] => {
    const actions: NoticeAction[] = [];
    const pending = pendingAudioRef.current;
    const retry = pending && RETRYABLE.has(err.type)
      ? { label: t.actions.retry, onClick: () => transcribe(pending.blob, pending.duration) }
      : null;

    switch (err.type) {
      case ErrorType.INSUFFICIENT_QUOTA:
        actions.push({ label: t.actions.topUp, primary: true, onClick: () => window.electronAPI.openExternal(EXTERNAL_LINKS.OPENAI_BILLING) });
        break;
      case ErrorType.API_KEY_INVALID:
        actions.push({ label: t.actions.openSettings, primary: true, onClick: () => { setError(null); setIsSettingsOpen(true); } });
        break;
      case ErrorType.MICROPHONE_ACCESS_DENIED:
        actions.push({ label: t.actions.openSystemSettings, primary: true, onClick: () => window.electronAPI.openSystemPreferences() });
        break;
    }
    if (retry) actions.push({ ...retry, primary: actions.length === 0 });
    return actions;
  };

  const contextValue: AppContextValue = {
    isRecording,
    isProcessing,
    transcribedText,
    error,
    history,
    recordingDuration,
    uiLanguage,
    t,
    setIsRecording,
    setIsProcessing,
    setTranscribedText,
    setError,
    addToHistory,
    clearHistory,
    setRecordingDuration,
    setUILanguage,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex h-screen flex-col">
        <TitleBar
          view={view}
          onViewChange={setView}
          historyCount={history.length}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {view === 'transcribe' ? (
          <main key="transcribe" className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 animate-fade">
            <StatusIndicator language={settings?.dictationLanguage ?? AUTO_LANGUAGE} />
            {error ? (
              <ErrorDisplay error={error} actions={noticeActions(error)} onDismiss={() => setError(null)} />
            ) : trusted === false && settings?.triggerKey !== 'off' ? (
              <section className="card flex shrink-0 items-center gap-3 p-3.5 pl-4 animate-rise">
                <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink/65">{granting ? t.anywhere.granting : t.anywhere.permissionMissing}</p>
                {!granting && (
                  <button onClick={() => { setGranting(true); window.electronAPI.requestAccessibility(); }} className="pill-solid shrink-0 !px-3 !py-1.5 !text-xs">
                    {t.anywhere.grant}
                  </button>
                )}
              </section>
            ) : null}
            <TextDisplay onCopy={copyText} />
            <RecordingControl
              audioRecorder={audioRecorderRef.current}
              onRecordingComplete={transcribe}
              triggerKey={settings?.triggerKey ?? 'control'}
            />
          </main>
        ) : (
          <main key="history" className="flex min-h-0 flex-1 flex-col px-4 pb-4 animate-fade">
            <HistoryList
              history={history}
              onSelectItem={handleSelectHistoryItem}
              onCopyItem={item => copyText(item.text)}
              onClearHistory={clearHistory}
            />
          </main>
        )}

        <Settings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
        <Toast message={toast} onClose={() => setToast(null)} />
      </div>
    </AppContext.Provider>
  );
};

export default App;
