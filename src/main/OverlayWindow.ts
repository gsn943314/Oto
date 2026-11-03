import { BrowserWindow, screen, app, systemPreferences } from 'electron';
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
      hiddenInMissionControl: false,
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
    // Creating an indicator must not transform/reactivate the whole app while
    // the user is moving between Spaces or using Mission Control.
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
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
  private state: OverlayState = { kind: 'hidden' };
  private revision = 0;
  private badgeVisible = false;
  private workspaceSubscription: number | null = null;
  private workspaceTimer: NodeJS.Timeout | null = null;
  showBadge = true;

  private observeWorkspace(): void {
    if (process.platform !== 'darwin' || this.workspaceSubscription !== null) return;
    this.workspaceSubscription = systemPreferences.subscribeWorkspaceNotification(
      'NSWorkspaceActiveSpaceDidChangeNotification',
      () => {
        if (this.workspaceTimer) clearTimeout(this.workspaceTimer);
        if (this.state.kind !== 'hidden') console.log('[overlay] restoring indicators after Space change');
        this.restoreIndicators();
        // Mission Control may still be completing its transition when it notifies us.
        this.workspaceTimer = setTimeout(() => {
          this.workspaceTimer = null;
          this.restoreIndicators();
        }, 300);
      },
    );
  }

  private restoreIndicators(): void {
    if (this.state.kind === 'hidden') return;
    const restore = (win: BrowserWindow | null, place: (win: BrowserWindow) => void) => {
      if (!win) return;
      win.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true,
      });
      place(win);
      win.webContents.send(IPC_CHANNELS.OVERLAY_STATE, this.state);
      // isVisible() alone doesn't tell us whether macOS ordered it onto the new Space.
      win.showInactive();
    };
    restore(this.pill.peek(), win => this.placePill(win));
    if (this.showBadge && this.badgeVisible) restore(this.badge.peek(), win => this.moveBadge(win));
  }

  async update(state: OverlayState): Promise<void> {
    this.observeWorkspace();
    const revision = ++this.revision;
    this.state = state;
    this.badgeVisible = this.showBadge && state.kind !== 'hidden';
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
    if (this.badgeTimer) { clearTimeout(this.badgeTimer); this.badgeTimer = null; }

    if (state.kind === 'hidden') {
      this.hideAll();
      return;
    }

    const pill = await this.pill.get();
    if (revision !== this.revision) return;
    if (pill) {
      pill.webContents.send(IPC_CHANNELS.OVERLAY_STATE, state);
      if (!pill.isVisible()) {
        this.placePill(pill);
        pill.showInactive();
      }
    }

    if (this.showBadge) {
      const badge = await this.badge.get();
      if (revision !== this.revision) return;
      if (badge) {
        badge.webContents.send(IPC_CHANNELS.OVERLAY_STATE, state);
        if (!badge.isVisible()) {
          this.moveBadge(badge);
          badge.showInactive();
        }
      }
    } else {
      this.badge.peek()?.hide();
    }
    this.startFollowing();

    const linger = LINGER[state.kind];
    if (linger) this.hideTimer = setTimeout(() => this.hideAll(), linger);
    const badgeLinger = BADGE_LINGER[state.kind];
    if (badgeLinger) this.badgeTimer = setTimeout(() => { this.badgeVisible = false; this.badge.peek()?.hide(); }, badgeLinger);
  }

  private hideAll(): void {
    this.state = { kind: 'hidden' };
    this.badgeVisible = false;
    this.pill.peek()?.hide();
    this.badge.peek()?.hide();
    this.stopFollowing();
  }

  // bottom centre of the screen the pointer is on
  private placePill(win: BrowserWindow): void {
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const x = Math.round(workArea.x + (workArea.width - this.pill.width) / 2);
    const y = Math.round(workArea.y + workArea.height - this.pill.height - 40);
    const bounds = win.getBounds();
    if (bounds.x !== x || bounds.y !== y) {
      win.setBounds({ x, y, width: this.pill.width, height: this.pill.height });
    }
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
      const pill = this.pill.peek();
      if (pill && this.state.kind !== 'hidden') this.placePill(pill);
      const badge = this.badge.peek();
      if (badge && this.badgeVisible) this.moveBadge(badge);
    }, 16);
  }

  private stopFollowing(): void {
    if (this.follow) { clearInterval(this.follow); this.follow = null; }
  }

  destroy(): void {
    ++this.revision;
    this.state = { kind: 'hidden' };
    if (this.workspaceSubscription !== null) {
      systemPreferences.unsubscribeWorkspaceNotification(this.workspaceSubscription);
      this.workspaceSubscription = null;
    }
    if (this.workspaceTimer) clearTimeout(this.workspaceTimer);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.badgeTimer) clearTimeout(this.badgeTimer);
    this.stopFollowing();
    this.pill.destroy();
    this.badge.destroy();
  }
}
