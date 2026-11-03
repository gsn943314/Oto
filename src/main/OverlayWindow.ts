import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { IPC_CHANNELS } from '../shared/constants.js';
import type { OverlayState } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// how long a finished state stays before the indicators go away
const LINGER: Partial<Record<OverlayState['kind'], number>> = { pasted: 1600, copied: 2800, error: 3800 };
// the pointer badge only needs to confirm, the pill carries the words
const BADGE_LINGER: Partial<Record<OverlayState['kind'], number>> = { pasted: 900, copied: 1400, error: 2200 };

/** A small see-through window that floats over every app, never takes focus and lets clicks through */
class FloatingWindow {
  private window: BrowserWindow | null = null;
  private ready: Promise<void> | null = null;

  constructor(private hash: string, readonly width: number, readonly height: number) {}

  async get(): Promise<BrowserWindow | null> {
    if (!this.window || this.window.isDestroyed()) this.create();
    await this.ready;
    return this.window && !this.window.isDestroyed() ? this.window : null;
  }

  peek(): BrowserWindow | null {
    return this.window && !this.window.isDestroyed() ? this.window : null;
  }

  private create(): void {
    const win = new BrowserWindow({
      width: this.width,
      height: this.height,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      focusable: false,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
        backgroundThrottling: false,
      },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setIgnoreMouseEvents(true);

    if (!app.isPackaged) {
      win.loadURL(`http://localhost:${process.env.VITE_DEV_SERVER_PORT || '5173'}/#${this.hash}`);
    } else {
      win.loadFile(path.join(__dirname, '../../renderer/index.html'), { hash: this.hash });
    }
    this.ready = new Promise(resolve => win.webContents.once('did-finish-load', () => resolve()));
    win.on('closed', () => { this.window = null; this.ready = null; });
    this.window = win;
  }

  destroy(): void {
    this.peek()?.destroy();
  }
}

// While dictating from another app, two things float over everything: a pill at the bottom of the screen
// with the waveform and the words ("Pasted into Slack"), and a small badge that rides next to the pointer so
// the state is in sight wherever you're looking.
export class OverlayWindow {
  private pill = new FloatingWindow('overlay', 340, 96);
  private badge = new FloatingWindow('cursor', 64, 64);
  private hideTimer: NodeJS.Timeout | null = null;
  private badgeTimer: NodeJS.Timeout | null = null;
  private follow: NodeJS.Timeout | null = null;
  showBadge = true;

  async update(state: OverlayState): Promise<void> {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
    if (this.badgeTimer) { clearTimeout(this.badgeTimer); this.badgeTimer = null; }

    if (state.kind === 'hidden') {
      this.hideAll();
      return;
    }

    const pill = await this.pill.get();
    if (pill) {
      pill.webContents.send(IPC_CHANNELS.OVERLAY_STATE, state);
      if (!pill.isVisible()) {
        this.placePill(pill);
        pill.showInactive();
      }
    }

    if (this.showBadge) {
      const badge = await this.badge.get();
      if (badge) {
        badge.webContents.send(IPC_CHANNELS.OVERLAY_STATE, state);
        if (!badge.isVisible()) {
          this.moveBadge(badge);
          badge.showInactive();
        }
        this.startFollowing();
      }
    } else {
      this.badge.peek()?.hide();
      this.stopFollowing();
    }

    const linger = LINGER[state.kind];
    if (linger) this.hideTimer = setTimeout(() => this.hideAll(), linger);
    const badgeLinger = BADGE_LINGER[state.kind];
    if (badgeLinger) this.badgeTimer = setTimeout(() => { this.badge.peek()?.hide(); this.stopFollowing(); }, badgeLinger);
  }

  private hideAll(): void {
    this.pill.peek()?.hide();
    this.badge.peek()?.hide();
    this.stopFollowing();
  }

  // bottom centre of the screen the pointer is on
  private placePill(win: BrowserWindow): void {
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    win.setBounds({
      x: Math.round(workArea.x + (workArea.width - this.pill.width) / 2),
      y: Math.round(workArea.y + workArea.height - this.pill.height - 40),
      width: this.pill.width,
      height: this.pill.height,
    });
  }

  // just below and to the right of the pointer, kept on its screen
  private moveBadge(win: BrowserWindow): void {
    const p = screen.getCursorScreenPoint();
    const { bounds } = screen.getDisplayNearestPoint(p);
    const size = this.badge.width;
    const x = Math.min(p.x + 8, bounds.x + bounds.width - size);
    const y = Math.min(p.y + 8, bounds.y + bounds.height - size);
    const [cx, cy] = win.getPosition();
    if (cx !== x || cy !== y) win.setPosition(x, y, false);
  }

  private startFollowing(): void {
    if (this.follow) return;
    this.follow = setInterval(() => {
      const win = this.badge.peek();
      if (win?.isVisible()) this.moveBadge(win);
    }, 16);
  }

  private stopFollowing(): void {
    if (this.follow) { clearInterval(this.follow); this.follow = null; }
  }

  destroy(): void {
    this.stopFollowing();
    this.pill.destroy();
    this.badge.destroy();
  }
}
