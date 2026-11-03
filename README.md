# OTO

<img src="build/icon.svg" alt="OTO app icon" width="128" />

A small macOS voice input app built on the **OpenAI GPT Transcribe API**. Tap a trigger key, speak, and put the transcript into the app you're working in.

This project began with OpenAI Whisper and has since migrated to GPT Transcribe.

I use voice input a lot while developing. I really enjoy Typeless, and wanted to try building a small version of my own: a simple tool that stays out of the way and lets me bring my own API key. This is an independent personal project, with no affiliation with Typeless or OpenAI.

[Download for macOS](https://github.com/gsn943314/voice-input-assistant/releases/latest) · [繁體中文介紹](docs/README.zh-TW.md) · [MIT License](LICENSE)

## What it does

- Tap **Control**, **fn**, or **Right Option** alone to start recording; tap again to stop and transcribe. Configure this in **Settings → Dictate anywhere → Trigger key**.
- Automatically paste into the focused input field, or leave the result on the clipboard for manual pasting.
- Keep dictating while the main window is minimized or hidden.
- See a recording waveform and processing status in a bright floating pill and an optional badge next to the pointer.
- Let the model detect the spoken language, or pin a language. Chinese transcripts are converted to Traditional Chinese with Taiwan wording.
- Review and clear local transcription history; adjust window opacity and history length.

Transcription happens **after** recording stops. The app uses the hosted `gpt-transcribe` API, requires an internet connection, and does not run a speech model locally. The interface is currently English. Windows, Linux, and iOS are not supported by this repository.

## Download options

Each [Release](https://github.com/gsn943314/voice-input-assistant/releases/latest) includes:

- **Ready-to-use app:** download `OTO-<version>-arm64.dmg` / `.zip` for Apple Silicon, or `OTO-<version>-x64.dmg` / `.zip` for Intel. No Node.js, Xcode, or build step is needed.
- **Source code:** download `OTO-<version>-source.zip`, use GitHub's Source code archives, or clone the repository. Follow [Build from source](#build-from-source) to make your own app.
- **Checksums:** `SHA256SUMS.txt` lists the release artifacts' SHA-256 digests.

## Install and use

1. Download the ZIP or DMG matching your Mac from [Releases](https://github.com/gsn943314/voice-input-assistant/releases/latest): **arm64** for Apple Silicon, **x64** for Intel.
2. Move the app to **Applications** and open it. These builds are not Apple-notarized. If blocked, try opening once, then go to **System Settings → Privacy & Security → Open Anyway**, authenticate, and confirm **Open**. See the [full opening guide](SECURITY_WARNING_SOLUTION.md).
3. Open Settings, paste **your own [OpenAI API key](https://platform.openai.com/api-keys)**, and save. You need API access to `gpt-transcribe` and sufficient API balance or quota; OpenAI charges API usage to your account. Check your [billing](https://platform.openai.com/settings/organization/billing/overview) and [usage](https://platform.openai.com/usage).
4. Allow **Microphone** access. Enable the app in **System Settings → Privacy & Security → Accessibility** for the global trigger and automatic paste.
5. Choose a trigger key, focus a text field in another app, tap the key, speak, and tap again. Or use the microphone button in the app without a global trigger.

Tap the trigger by itself. Key combinations such as Control+C should continue working normally. For fn, disable macOS's own fn dictation action if it conflicts. Automatic paste can fail in protected or unsupported fields; the transcript stays on the clipboard so you can paste it yourself. Closing the window hides it; **Command+Q** quits the app.

## Privacy and your API key

**No API key or transcription history is included in this repository or the downloadable app.** Every user supplies their own key in Settings. No environment file or shared backend is required.

- Settings, history, and window state live in Electron's local user-data directory, normally `~/Library/Application Support/voice-input-app/`.
- The API key is protected with Electron `safeStorage` when available (backed by macOS Keychain). The legacy fallback is Base64 inside an obfuscated settings store; it is not equivalent to secure encryption.
- Recorded audio is sent directly to OpenAI for transcription using your key. See [OpenAI's data controls](https://developers.openai.com/api/docs/guides/your-data) for their handling of API data.
- The app creates a temporary audio file for upload and deletes it when the request finishes. A forced quit or crash can leave a temporary file behind.
- Transcript history stays on your Mac until you clear it or it ages out of the configured limit. Automatic paste also puts the current transcript on the macOS clipboard.
- Logs stay locally under `~/Library/Logs/voice-input-app/`; review and redact logs before sharing a bug report.
- `.gitignore` excludes local settings/history files, credentials, recordings, logs, and build output. Do not manually add your local application-data folder to a commit.

## Build from source

Requires **macOS 11 or later**, **Node.js 20+**, npm, and **Xcode Command Line Tools** (Swift compiler, `lipo`, and `codesign`). Install the tools with `xcode-select --install` if needed.

```sh
git clone https://github.com/gsn943314/voice-input-assistant.git
cd voice-input-assistant
npm ci
npm run check
npm run dev
```

If you downloaded the source ZIP, extract it and run the same commands starting at `npm ci` from the extracted directory.

Development starts Vite on port **5173**, compiles the Swift helper and Electron code, and opens the app once Vite is ready. Restart development after changing main-process code. Changes to renderer code reload automatically.

To make a distributable app:

```sh
# Choose one architecture, or omit the flag to build both.
npm run package:mac -- --arm64
# npm run package:mac -- --x64
```

Output goes into `release/`. To build just an unpacked `.app`, use `npm run package:mac:dir -- --arm64`. Packaging builds the icon and native helper from source and applies an ad-hoc signature. It does not require an Apple Developer account. A rebuild can require granting macOS permissions again. See [PACKAGING.md](PACKAGING.md).

## Architecture

| Part | Responsibility |
| --- | --- |
| `src/renderer/` | React + TypeScript UI, microphone capture using MediaRecorder, settings/history views, status animations |
| `src/main/` | Electron app lifecycle, isolated IPC handlers, windows, clipboard, local storage, and OpenAI requests |
| `src/main/preload.cjs` | Narrow `contextBridge` API between the renderer and main process; Node integration is disabled in the UI |
| `native/voiceinput-helper.swift` | macOS event tap for the trigger key, Accessibility checks, and paste into the active application |
| `src/shared/` | Shared types, language lists, translated messages, and IPC channel names |
| `scripts/` | Native helper compilation, icon generation, development startup, and package signing |

The Swift helper reports a trigger tap to Electron over newline-delimited JSON on stdin/stdout. Electron signals the renderer to start or stop microphone capture. Once recording stops, the renderer sends audio through IPC; the main process calls OpenAI's audio transcription endpoint with `gpt-transcribe`, returns the result, and the renderer saves it in local history. For dictation from another app, the main process copies the text and asks the helper to paste it. Separate non-focusable, click-through Electron windows show the floating status indicators.

There is no project-hosted server, cloud history sync, or bundled speech model.

## Transcription model

OTO started as a Whisper-based app and now uses **`gpt-transcribe`**. It sends JSON-format transcription requests with optional `languages` hints and reads the model's detected-language array. An empty array is valid; it does not mean transcription failed. Chinese predictions, including mixed-language results, are converted to Traditional Chinese locally.

Your existing OpenAI API key can be reused if its project and permissions allow the model and the account has available quota. Each user supplies their own key. See [OpenAI's model documentation](https://developers.openai.com/api/docs/models/gpt-transcribe) for current availability and pricing. There is no automatic fallback to Whisper.

## Contributing and license

Bug reports and small improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Please leave API keys, recordings, and personal transcripts out of issues and pull requests.

Released under the [MIT License](LICENSE): you may use, modify, distribute, and sell copies while retaining the license and copyright notices. Sharing improvements back is appreciated, but not required.
