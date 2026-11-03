// Wait for Vite before opening Electron, including on a clean checkout.
const http = require('node:http');
const { spawn } = require('node:child_process');
const deadline = Date.now() + 30_000;
function launchWhenReady() {
  const request = http.get('http://localhost:5173', response => {
    response.resume();
    if (response.statusCode !== 200) return retry();
    const env = { ...process.env, VITE_DEV_SERVER_PORT: '5173' };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(require('electron'), ['.'], { stdio: 'inherit', env });
    child.on('error', error => { console.error(error.message); process.exit(1); });
    child.on('exit', code => process.exit(code ?? 1));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  });
  request.setTimeout(1000, () => request.destroy());
  request.on('error', retry);
}
function retry() {
  if (Date.now() >= deadline) {
    console.error('Vite did not start on port 5173 within 30 seconds.');
    process.exit(1);
  }
  setTimeout(launchWhenReady, 250);
}
launchWhenReady();
