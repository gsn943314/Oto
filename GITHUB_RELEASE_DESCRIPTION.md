# Oto 1.1.1

A small macOS voice input app powered by OpenAI GPT Transcribe. Built because I often use voice input while developing and wanted to try making a small version of my own after enjoying Typeless. This independent project is MIT licensed.

## Choose your download

| Download | Use it for |
| --- | --- |
| `Oto-1.1.1-arm64.dmg` or `.zip` | Ready-to-use app for Apple Silicon Macs |
| `Oto-1.1.1-x64.dmg` or `.zip` | Ready-to-use app for Intel Macs |
| `Oto-1.1.1-source.zip` | Source code to inspect, modify, and build yourself |
| `SHA256SUMS.txt` | Checksums for the release files |

The app requires macOS 11 or later and an internet connection. The source download needs Node.js 20+ and Xcode Command Line Tools; see [build instructions](https://github.com/gsn943314/Oto#build-from-source).

## First launch: unnotarized app

Oto is ad-hoc signed, **not Apple-notarized**. After moving Oto.app into Applications:

1. Try opening the app once.
2. If blocked, open **System Settings → Privacy & Security → Open Anyway** for Oto.
3. Authenticate and confirm **Open** in the macOS dialog.
4. Add **your own OpenAI API key** in Oto's Settings.
5. Allow **Microphone** access and enable **Oto** in **Accessibility** for global triggering and automatic paste.

See the [full opening and permission guide](https://github.com/gsn943314/Oto/blob/main/SECURITY_WARNING_SOLUTION.md). Replacing an ad-hoc signed build may require permission again.

## This version

- Recording and processing indicators persist across macOS Spaces, with the main window hidden or minimized.
- Starting a recording with the app button also shows the floating indicators.
- Indicators restore after desktop changes without focusing or restoring the main window; expired messages stay hidden.
- Settings now starts with the OpenAI API key and a larger key-creation button, followed by Accessibility permission.
- Balance and Usage links are collapsed under Additional account options; Trigger key is simpler and pointer/paste preferences are under Window.
- Added an Electron regression test for overlay restoration, minimized/hidden windows, focus, and asynchronous stop handling.

Every user supplies their own API key and pays their own OpenAI API usage. Existing OpenAI keys can be reused when permissions and quota allow this model. No author API keys, recordings, or transcription history are included. Audio is sent directly to OpenAI using the user's account.
