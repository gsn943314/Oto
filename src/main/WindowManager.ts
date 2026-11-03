import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WindowConfig {
  width: number;
  height: number;
  alwaysOnTop: boolean;
  frame: boolean;
  transparent: boolean;
  resizable: boolean;
}

interface WindowPosition {
  x: number;
  y: number;
}

export class WindowManager {
  private window: BrowserWindow | null = null;
  private store: Store;

  constructor() {
    this.store = new Store({
      name: 'window-state',
    });
  }

  createMainWindow(config: WindowConfig): BrowserWindow {
    // Load saved position or use default
    const savedPosition = this.store.get('windowPosition') as WindowPosition | undefined;
    const { x, y } = this.getValidWindowPosition(savedPosition, config.width, config.height);

    this.window = new BrowserWindow({
      width: config.width,
      height: config.height,
      x,
      y,
      alwaysOnTop: config.alwaysOnTop,
      frame: config.frame,
      transparent: config.transparent,
      resizable: config.resizable,
      opacity: 1.0, // Set initial opacity to 100% (fully opaque)
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
        // it records and transcribes while another app is in front
        backgroundThrottling: false,
      },
    });

    // 設定視窗行為：固定在當前桌面（Space）
    // NSWindowCollectionBehaviorCanJoinAllSpaces = 1 << 0 (可以出現在所有桌面)
    // NSWindowCollectionBehaviorMoveToActiveSpace = 1 << 1 (移動到活動桌面)
    // 我們不設定這些，讓視窗固定在當前桌面
    if (process.platform === 'darwin') {
      // 設定為固定在當前桌面，不跟隨到其他桌面
      this.window.setVisibleOnAllWorkspaces(false, { visibleOnFullScreen: true });
    }

    // Save window position when moved
    this.window.on('moved', () => {
      this.saveWindowPosition();
    });

    // Clean up on close
    this.window.on('closed', () => {
      this.saveWindowPosition();
      this.window = null;
    });

    return this.window;
  }

  setAlwaysOnTop(value: boolean): void {
    if (this.window) {
      this.window.setAlwaysOnTop(value);
    }
  }

  setOpacity(opacity: number): void {
    if (this.window) {
      // Clamp opacity between 0.5 and 1.0
      const clampedOpacity = Math.max(0.5, Math.min(1.0, opacity));
      this.window.setOpacity(clampedOpacity);
      console.log(`Window opacity set to: ${clampedOpacity}`);
    }
  }

  setPosition(x: number, y: number): void {
    if (this.window) {
      this.window.setPosition(x, y);
    }
  }

  minimize(): void {
    if (this.window) {
      this.window.minimize();
    }
  }

  // the close button only hides the window: dictation from other apps keeps working (⌘Q quits)
  close(): void {
    if (this.window) {
      this.window.hide();
    }
  }

  show(): void {
    if (this.window) {
      this.window.show();
    }
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  private saveWindowPosition(): void {
    if (this.window && !this.window.isDestroyed()) {
      const [x, y] = this.window.getPosition();
      this.store.set('windowPosition', { x, y });
    }
  }

  private getValidWindowPosition(
    savedPosition: WindowPosition | undefined,
    width: number,
    height: number
  ): WindowPosition {
    if (!savedPosition) {
      // Center window on primary display
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      return {
        x: Math.floor((screenWidth - width) / 2),
        y: Math.floor((screenHeight - height) / 2),
      };
    }

    // Validate saved position is still on screen
    const displays = screen.getAllDisplays();
    const isOnScreen = displays.some((display) => {
      const { x, y, width: dWidth, height: dHeight } = display.bounds;
      return (
        savedPosition.x >= x &&
        savedPosition.x + width <= x + dWidth &&
        savedPosition.y >= y &&
        savedPosition.y + height <= y + dHeight
      );
    });

    if (isOnScreen) {
      return savedPosition;
    }

    // If saved position is off-screen, center on primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    return {
      x: Math.floor((screenWidth - width) / 2),
      y: Math.floor((screenHeight - height) / 2),
    };
  }
}
