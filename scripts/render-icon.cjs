// Rasterize our SVG with the same Chromium renderer as the app.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const source = path.resolve(process.argv[2] || 'build/icon.svg');
const output = path.resolve(process.argv[3] || 'build/icon.png');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'voiceinput-icon-'));
app.setPath('userData', temporary);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1024, height: 1024, show: false, transparent: true,
    webPreferences: { offscreen: true, nodeIntegration: false, contextIsolation: true } });
  const svg = fs.readFileSync(source, 'utf8');
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
    '<style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block;width:1024px;height:1024px}</style>' + svg));
  const image = await win.webContents.capturePage();
  fs.writeFileSync(output, image.toPNG());
  win.destroy();
}).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  app.quit();
  fs.rmSync(temporary, { recursive: true, force: true });
});
