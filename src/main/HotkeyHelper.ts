import { app } from 'electron';
import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import type { TriggerKey, PasteResult } from '../shared/types.js';

// Runs native/voiceinput-helper (see its header for the protocol): it tells us when the trigger key is
// tapped in any app, and pastes into whatever field has focus. Restarted if it ever dies.
export class HotkeyHelper extends EventEmitter {
  private child: ChildProcess | null = null;
  private trigger: TriggerKey = 'control';
  private nextId = 1;
  private pending = new Map<number, (r: { result: PasteResult; app?: string }) => void>();
  private stopped = false;
  trusted = false;

  private get binary(): string {
    return app.isPackaged
      ? path.join(process.resourcesPath, 'native', 'voiceinput-helper')
      : path.join(app.getAppPath(), 'build', 'native', 'voiceinput-helper');
  }

  start(): void {
    if (process.platform !== 'darwin' || this.child) return;
    if (!fs.existsSync(this.binary)) {
      console.error(`[helper] not found at ${this.binary}; run scripts/build-helper.sh`);
      return;
    }
    this.stopped = false;
    console.log(`[helper] starting ${this.binary}`);
    const child = spawn(this.binary, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stderr?.on('data', d => console.error(`[helper] ${String(d).trim()}`));
    this.child = child;

    readline.createInterface({ input: child.stdout! }).on('line', line => {
      let msg: any;
      try { msg = JSON.parse(line); } catch { return; }
      switch (msg.event) {
        case 'ready':
        case 'trust':
          this.trusted = !!msg.trusted;
          this.emit('trust', this.trusted);
          break;
        case 'tap':
          this.emit('tap');
          break;
        case 'pasted': {
          console.log(`[helper] paste → ${msg.result}${msg.app ? ` (${msg.app})` : ''}`);
          const resolve = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          resolve?.({ result: msg.result, app: msg.app });
          break;
        }
      }
    });

    child.on('exit', code => {
      this.child = null;
      for (const resolve of this.pending.values()) resolve({ result: 'failed' });
      this.pending.clear();
      if (!this.stopped) {
        console.error(`[helper] exited (${code}); restarting`);
        setTimeout(() => this.start(), 1000);
      }
    });

    this.write({ cmd: 'setTrigger', key: this.trigger });
  }

  stop(): void {
    this.stopped = true;
    this.child?.kill();
    this.child = null;
  }

  setTrigger(key: TriggerKey): void {
    this.trigger = key;
    this.write({ cmd: 'setTrigger', key });
  }

  /** Ask for Accessibility permission (shows the system prompt when `prompt`) */
  checkTrust(prompt: boolean): void {
    this.write({ cmd: 'trust', prompt });
  }

  /** Paste the clipboard into the focused field of the frontmost app */
  paste(): Promise<{ result: PasteResult; app?: string }> {
    if (!this.child) return Promise.resolve({ result: 'failed' });
    const id = this.nextId++;
    return new Promise(resolve => {
      this.pending.set(id, resolve);
      this.write({ cmd: 'paste', id });
      setTimeout(() => {
        if (this.pending.delete(id)) resolve({ result: 'failed' });
      }, 2000);
    });
  }

  private write(msg: object): void {
    this.child?.stdin?.write(JSON.stringify(msg) + '\n');
  }
}
