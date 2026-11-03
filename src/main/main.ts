import { app, systemPreferences } from 'electron';
import fs from 'fs';
import { format } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { WindowManager } from './WindowManager.js';
import { SettingsManager } from './SettingsManager.js';
import { HistoryManager } from './HistoryManager.js';
import { IPCHandler } from './IPCHandler.js';
import { HotkeyHelper } from './HotkeyHelper.js';
import { OverlayWindow } from './OverlayWindow.js';
import { IPC_CHANNELS } from '../shared/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep existing local settings and history across the Oto rename.
if (!app.commandLine.hasSwitch('user-data-dir')) {
  app.setPath('userData', path.join(app.getPath('appData'), 'voice-input-app'));
}

// Everything the main process says also goes to ~/Library/Logs/voice-input-app/main.log, so a packaged app's
// problems (permission, helper, OpenAI) can be read after the fact
try {
  const logFile = path.join(app.getPath('logs'), 'main.log');
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  if (fs.existsSync(logFile) && fs.statSync(logFile).size > 2_000_000) fs.renameSync(logFile, logFile + '.old');
  const out = fs.createWriteStream(logFile, { flags: 'a' });
  for (const level of ['log', 'warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      out.write(`${new Date().toISOString()} [${level}] ${format(...args)}\n`);
      original(...args);
    };
  }
} catch { /* logging is best-effort */ }

// recording starts from a key tapped in another app, with no click in this window to unlock audio
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let windowManager: WindowManager;
let settingsManager: SettingsManager;
let historyManager: HistoryManager;
const hotkey = new HotkeyHelper();
const overlay = new OverlayWindow();
let permissionTimer: NodeJS.Timeout | undefined;

function createWindow() {
  const window = windowManager.createMainWindow({
    width: 400,
    height: 600,
    alwaysOnTop: true,
    frame: false,
    transparent: false,  // 關閉透明，使用不透明視窗
    resizable: true,
  });

  // Load settings and apply window opacity
  try {
    const settings = settingsManager.load();
    console.log('Loaded settings:', { windowOpacity: settings.windowOpacity });
    windowManager.setOpacity(settings.windowOpacity);
  } catch (error) {
    console.error('Failed to load settings, using default opacity:', error);
    windowManager.setOpacity(1.0); // Fallback to fully opaque
  }

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // In development, try common Vite ports
    const devPort = process.env.VITE_DEV_SERVER_PORT || '5173';
    window.loadURL(`http://localhost:${devPort}`);
    
    // Only open DevTools if enabled in settings
    try {
      const settings = settingsManager.load();
      if (settings.openDevTools) {
        window.webContents.openDevTools();
      }
    } catch (error) {
      console.error('Failed to check DevTools setting:', error);
    }
  } else {
    // In production, load from the packaged files
    // Path is relative to dist/main/main/main.js
    window.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }
  return window;
}

app.whenReady().then(() => {
  // Initialize managers
  windowManager = new WindowManager();
  settingsManager = new SettingsManager();
  historyManager = new HistoryManager();
  new IPCHandler(settingsManager, historyManager, windowManager, hotkey, overlay);

  createWindow();

  // tapping the trigger key in any app starts or stops dictation in the (possibly hidden) main window
  hotkey.on('tap', () => {
    console.log('[hotkey] tap');
    let win = windowManager.getWindow();
    if (!win) {
      win = createWindow();
      win.webContents.once('did-finish-load', () => win!.webContents.send(IPC_CHANNELS.HOTKEY_TOGGLE));
      return;
    }
    win.webContents.send(IPC_CHANNELS.HOTKEY_TOGGLE);
  });
  hotkey.on('trust', (trusted: boolean) => {
    console.log(`[hotkey] accessibility trusted=${trusted}`);
    windowManager.getWindow()?.webContents.send(IPC_CHANNELS.ACCESSIBILITY_CHANGED, trusted);
  });
  hotkey.start();
  // macOS can keep an already-running helper's permission result cached after a grant.
  // Reconnect it once when the parent is trusted, without repeatedly restarting it.
  let reconnectedForGrant = false;
  permissionTimer = setInterval(() => {
    const parentTrusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (!parentTrusted) { reconnectedForGrant = false; return; }
    if (!hotkey.trusted && !reconnectedForGrant) {
      reconnectedForGrant = true;
      console.log('[accessibility] refreshing helper after permission grant');
      hotkey.restart();
    }
  }, 2000);
  const startup = settingsManager.load();
  hotkey.setTrigger(startup.triggerKey ?? 'control');
  overlay.showBadge = startup.pointerBadge ?? true;

  app.on('activate', () => {
    if (windowManager.getWindow() === null) {
      createWindow();
    } else {
      windowManager.show();
    }
  });
});

app.on('before-quit', () => {
  if (permissionTimer) clearInterval(permissionTimer);
  hotkey.stop();
  overlay.destroy();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
