A small macOS voice input app built on the OpenAI GPT Transcribe API. I use voice input often while developing and, inspired by enjoying Typeless, wanted to try building a version of my own.

Tap your configured trigger key to record, then tap again to transcribe and paste into the active app. Includes language detection, local history, a floating status pill, and an optional pointer badge. Works with the main window minimized or hidden.

Download **arm64** for Apple Silicon or **x64** for Intel. Move the app into Applications. Add **your own OpenAI API key** in Settings, allow Microphone, and enable Accessibility for global triggering and paste. Builds are ad-hoc signed, not Apple-notarized; see the README if macOS blocks opening.

MIT licensed. No author API keys, recordings, or transcription history are bundled. Audio is sent directly to OpenAI using your account. This project began with Whisper and now uses `gpt-transcribe`. Existing OpenAI keys can be reused when their permissions and quota allow this model.
