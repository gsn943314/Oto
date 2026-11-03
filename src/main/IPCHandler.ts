import { ipcMain, clipboard, shell, systemPreferences } from 'electron';
import { IPC_CHANNELS, EXTERNAL_LINKS } from '../shared/constants.js';
import { TranscriptionRequest, TranscriptionResponse, AppSettings, ErrorType, TranscriptionHistory, OverlayState, PasteResult } from '../shared/types.js';
import { SettingsManager } from './SettingsManager.js';
import { TranscriptionClient } from './TranscriptionClient.js';
import { AudioProcessor } from './AudioProcessor.js';
import { HistoryManager } from './HistoryManager.js';
import { WindowManager } from './WindowManager.js';
import { HotkeyHelper } from './HotkeyHelper.js';
import { OverlayWindow } from './OverlayWindow.js';

export class IPCHandler {
  private settingsManager: SettingsManager;
  private historyManager: HistoryManager;
  private windowManager: WindowManager;
  private transcriptionClient: TranscriptionClient | null = null;
  private hotkey: HotkeyHelper;
  private overlay: OverlayWindow;

  constructor(settingsManager: SettingsManager, historyManager: HistoryManager, windowManager: WindowManager, hotkey: HotkeyHelper, overlay: OverlayWindow) {
    this.settingsManager = settingsManager;
    this.historyManager = historyManager;
    this.windowManager = windowManager;
    this.hotkey = hotkey;
    this.overlay = overlay;
    this.initializeTranscriptionClient();
    this.registerHandlers();
  }

  private initializeTranscriptionClient(): void {
    const settings = this.settingsManager.load();
    if (settings.apiKey) {
      this.transcriptionClient = new TranscriptionClient({
        apiKey: settings.apiKey,
      });
    }
  }

  private updateTranscriptionClient(apiKey: string): void {
    if (this.transcriptionClient) {
      this.transcriptionClient.updateApiKey(apiKey);
    } else {
      this.transcriptionClient = new TranscriptionClient({ apiKey });
    }
  }

  private registerHandlers(): void {
    // Handle audio transcription
    ipcMain.handle(
      IPC_CHANNELS.TRANSCRIBE_AUDIO,
      async (_event, request: TranscriptionRequest): Promise<TranscriptionResponse> => {
        return this.handleTranscription(request);
      }
    );

    // Handle settings save
    ipcMain.handle(
      IPC_CHANNELS.SAVE_SETTINGS,
      async (_event, settings: AppSettings): Promise<void> => {
        return this.handleSaveSettings(settings);
      }
    );

    // Handle settings load
    ipcMain.handle(
      IPC_CHANNELS.LOAD_SETTINGS,
      async (): Promise<AppSettings> => {
        return this.handleLoadSettings();
      }
    );

    // Handle clipboard copy
    ipcMain.handle(
      IPC_CHANNELS.COPY_TO_CLIPBOARD,
      async (_event, text: string): Promise<boolean> => {
        return this.handleCopyToClipboard(text);
      }
    );

    // Handle history load
    ipcMain.handle(
      IPC_CHANNELS.LOAD_HISTORY,
      async (): Promise<TranscriptionHistory[]> => {
        return this.handleLoadHistory();
      }
    );

    // Handle history save
    ipcMain.handle(
      IPC_CHANNELS.SAVE_HISTORY,
      async (_event, history: TranscriptionHistory[]): Promise<void> => {
        return this.handleSaveHistory(history);
      }
    );

    // Handle history clear
    ipcMain.handle(
      IPC_CHANNELS.CLEAR_HISTORY,
      async (): Promise<void> => {
        return this.handleClearHistory();
      }
    );

    // Handle open system preferences
    ipcMain.handle(
      IPC_CHANNELS.OPEN_SYSTEM_PREFERENCES,
      async (): Promise<void> => {
        return this.handleOpenSystemPreferences();
      }
    );

    // Open one of the known OpenAI pages in the browser
    ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: string): Promise<void> => {
      if (!(Object.values(EXTERNAL_LINKS) as string[]).includes(url)) {
        throw new Error(`Refusing to open ${url}`);
      }
      await shell.openExternal(url);
    });

    // The floating pill follows the main window's dictation state
    ipcMain.on(IPC_CHANNELS.OVERLAY_STATE, (_event, state: OverlayState) => {
      this.overlay.update(state);
    });

    // bring the window up without taking focus from the app being typed in
    ipcMain.on(IPC_CHANNELS.SHOW_WINDOW, () => {
      const win = this.windowManager.getWindow();
      if (win && !win.isVisible()) win.showInactive();
    });

    // A finished transcript: always onto the clipboard, then typed into the focused field if there is one
    ipcMain.handle(IPC_CHANNELS.DELIVER_TEXT, async (_event, text: string) => this.deliverText(text));

    ipcMain.handle(IPC_CHANNELS.ACCESSIBILITY_STATUS, async (): Promise<boolean> => this.hotkey.trusted);
    ipcMain.handle(IPC_CHANNELS.ACCESSIBILITY_REQUEST, async (): Promise<void> => {
      console.log('[accessibility] grant requested');
      // Electron's own check registers the app in the list and shows macOS's prompt; then open the pane
      const trusted = systemPreferences.isTrustedAccessibilityClient(true);
      this.hotkey.checkTrust(false);
      if (trusted) return;
      try {
        await shell.openExternal(EXTERNAL_LINKS.ACCESSIBILITY_SETTINGS);
      } catch (error) {
        console.error('[accessibility] could not open System Settings:', error);
        await shell.openExternal('x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Accessibility');
      }
    });

    // Handle window minimize
    ipcMain.on(IPC_CHANNELS.MINIMIZE_WINDOW, () => {
      this.windowManager.minimize();
    });

    // Handle window close
    ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => {
      this.windowManager.close();
    });

    // Handle window opacity
    ipcMain.handle(IPC_CHANNELS.SET_WINDOW_OPACITY, async (_event, opacity: number) => {
      this.windowManager.setOpacity(opacity);
    });
  }

  async handleTranscription(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    let cleanup: (() => void) | null = null;
    
    try {
      // Check if API key is configured
      if (!this.transcriptionClient) {
        return {
          text: '',
          success: false,
          error: 'API key not configured. Please set your OpenAI API key in settings.',
          errorType: ErrorType.API_KEY_INVALID,
        };
      }

      // Process audio data: convert Blob to Buffer and validate
      const { buffer: audioBuffer, cleanup: cleanupFn } = AudioProcessor.processAudioData(request.audioBlob as any);
      cleanup = cleanupFn;
      
      console.log(`Processing audio file: ${AudioProcessor.getAudioSizeInfo(audioBuffer)}`);

      // Transcribe using OpenAI transcription API
      const { text, language } = await this.transcriptionClient.transcribe(audioBuffer, {
        language: request.language,
      });

      return {
        text,
        language,
        success: true,
      };
    } catch (error: any) {
      console.error('Transcription error:', error?.type, error?.message, error?.details ?? '');
      // The renderer words the message for the user; it needs to know which kind of failure this was
      const errorType: ErrorType = Object.values(ErrorType).includes(error?.type) ? error.type : ErrorType.UNKNOWN_ERROR;
      return {
        text: '',
        success: false,
        error: error?.message || 'An unknown error occurred',
        errorType,
      };
    } finally {
      // Clean up audio buffer to free memory
      if (cleanup) {
        cleanup();
      }
    }
  }

  async deliverText(text: string): Promise<{ result: PasteResult; app?: string }> {
    clipboard.writeText(text);
    if (!this.settingsManager.load().autoPaste) return { result: 'disabled' };
    if (this.windowManager.getWindow()?.isFocused()) return { result: 'ownWindow' };
    await new Promise(resolve => setTimeout(resolve, 60)); // let the pasteboard settle
    return this.hotkey.paste();
  }

  async handleSaveSettings(settings: AppSettings): Promise<void> {
    try {
      this.settingsManager.save(settings);
      this.hotkey.setTrigger(settings.triggerKey ?? 'control');
      this.overlay.showBadge = settings.pointerBadge ?? true;
      
      // Update TranscriptionClient with new API key if it changed
      if (settings.apiKey) {
        this.updateTranscriptionClient(settings.apiKey);
      } else {
        this.transcriptionClient = null;
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async handleLoadSettings(): Promise<AppSettings> {
    try {
      return this.settingsManager.load();
    } catch (error) {
      console.error('Failed to load settings:', error);
      throw error;
    }
  }

  async handleCopyToClipboard(text: string): Promise<boolean> {
    try {
      clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  async handleLoadHistory(): Promise<TranscriptionHistory[]> {
    try {
      return this.historyManager.load();
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  async handleSaveHistory(history: TranscriptionHistory[]): Promise<void> {
    try {
      this.historyManager.save(history);
    } catch (error) {
      console.error('Failed to save history:', error);
      throw error;
    }
  }

  async handleClearHistory(): Promise<void> {
    try {
      this.historyManager.clear();
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw error;
    }
  }

  async handleOpenSystemPreferences(): Promise<void> {
    try {
      // Open macOS System Preferences for microphone permissions
      if (process.platform === 'darwin') {
        await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
      }
    } catch (error) {
      console.error('Failed to open system preferences:', error);
      throw error;
    }
  }
}
