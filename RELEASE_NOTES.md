# Oto 1.1.1

- Keep the bottom status pill and pointer badge visible across macOS Spaces, including when the main window is hidden or minimized.
- Show indicators for recordings started with either the trigger key or the app button.
- Restore active indicators after Space changes without stealing focus; prevent late window creation or expired states from showing obsolete indicators.
- Put OpenAI API setup first, enlarge Get an API key, collapse Balance/Usage, and move Accessibility permission just below account setup.
- Simplify Trigger key and move automatic paste and pointer status preferences to Window.
- Add overlay regression coverage.

# Oto 1.1.0

- Renamed the app to Oto with a minimal rippling O icon.
- Migrated from Whisper to GPT Transcribe, including plural language hints, JSON responses, and mixed-language detection.

- Dictation from any app using one configurable trigger key: Control, fn, or Right Option.
- Automatic paste, with clipboard fallback.
- Recording and processing indicators in a bright floating pill and optional pointer badge.
- Recording feedback continues while the main window is minimized or hidden.
- Automatic spoken-language detection or a pinned language; Traditional Chinese conversion.
- Clearer API authentication, quota, rate-limit, and network errors, plus retry support.
- Removed the old Shortcut settings and key combinations; use Trigger key or the app button.
- Updated installation, architecture, privacy, and source-build documentation; MIT licensed.

Each user provides their own OpenAI API key. No personal settings or history are included. See the README for model access and macOS permission requirements.
