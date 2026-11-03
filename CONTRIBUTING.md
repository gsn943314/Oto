# Contributing

Issues and pull requests are welcome. Describe the problem, expected behavior, macOS version, and the steps needed to reproduce it. Redact API keys, transcripts, and other personal information from screenshots and logs.

See [README.md](README.md#build-from-source) for prerequisites and development commands. Before submitting a code change, run:

```sh
npm ci
npm run check
npm test
npm run build
```

For changes to dictation, also check recording through both the app button and trigger key, minimized-window behavior, processing feedback, clipboard fallback, and macOS permissions. For API tests, use your own key and account; never commit them. Do not include your local app settings, history, recordings, or generated build output.

Contributions are distributed under this project's [MIT License](LICENSE).
