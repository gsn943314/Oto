// Exercise the real SDK's multipart request and response handling without an API key or paid request.
const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const OpenAI = require('openai').default;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-transcription-test-'));
app.setPath('userData', temporary);
app.setPath('temp', temporary);
let server;
app.whenReady().then(async () => {
  const { TranscriptionClient } = await import(pathToFileURL(path.resolve('dist/main/main/TranscriptionClient.js')).href);
  const requests = [];
  let payload = { text: 'Hello.', languages: [{ code: 'en' }] };
  let status = 200;
  server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      requests.push({ url: request.url, body: Buffer.concat(chunks).toString() });
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(payload));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const client = new TranscriptionClient({ apiKey: '' });
  // Inject a local SDK client into the compiled TypeScript-private field. Production always uses OpenAI's endpoint.
  client.client = new OpenAI({ apiKey: 'local-test-placeholder', baseURL: `http://127.0.0.1:${server.address().port}/v1`, maxRetries: 0 });
  const audio = Buffer.from('test-audio');
  assert.deepEqual(await client.transcribe(audio), { text: 'Hello.', language: 'en' });
  assert.equal(requests[0].url, '/v1/audio/transcriptions');
  assert.match(requests[0].body, /name="model"\r\n\r\ngpt-transcribe/);
  assert.match(requests[0].body, /name="response_format"\r\n\r\njson/);
  assert.doesNotMatch(requests[0].body, /name="language"|name="languages\[\]"|verbose_json|whisper-1/);

  payload = { text: ' 软件开发 API ', languages: [{ code: 'en' }, { code: 'zh-cn' }] };
  assert.deepEqual(await client.transcribe(audio), { text: '軟體開發 API', language: 'en' });

  payload = { text: '软件开发', languages: [] };
  assert.deepEqual(await client.transcribe(audio, { language: 'zh' }), { text: '軟體開發', language: 'zh' });
  assert.match(requests.at(-1).body, /name="languages\[\]"\r\n\r\nzh-tw/);
  assert.doesNotMatch(requests.at(-1).body, /name="language"/);

  payload = { text: '  Uncertain language.  ', languages: [] };
  assert.deepEqual(await client.transcribe(audio, { language: 'auto' }), { text: 'Uncertain language.', language: undefined });
  payload = { text: '日本語の開発', languages: [{ code: 'ja' }] };
  assert.deepEqual(await client.transcribe(audio), { text: '日本語の開発', language: 'ja' });
  assert.equal(fs.readdirSync(temporary).filter(name => name.startsWith('audio-')).length, 0);

  const before = requests.length;
  status = 429;
  payload = { error: { message: 'Insufficient quota', type: 'insufficient_quota', code: 'insufficient_quota' } };
  await assert.rejects(client.transcribe(audio), error => error.type === 'INSUFFICIENT_QUOTA');
  assert.equal(requests.length, before + 1, 'Quota failures must not be retried');
  assert.equal(fs.readdirSync(temporary).filter(name => name.startsWith('audio-')).length, 0);
  const withoutKey = new TranscriptionClient({ apiKey: '' });
  await assert.rejects(withoutKey.transcribe(audio), error => error.type === 'API_KEY_INVALID');
  console.log('PASS: GPT-Transcribe multipart contract, auto/pinned/mixed/unknown languages, Traditional Chinese, Japanese preservation, quota handling, missing key, temporary audio cleanup. No live API requests.');
}).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  server?.close();
  app.quit();
  fs.rmSync(temporary, { recursive: true, force: true });
});
