# Opening Oto on macOS

Oto's community builds are **ad-hoc signed, not signed with an Apple Developer ID or notarized by Apple**. macOS may show an unidentified-developer or “Apple could not verify” warning. Use a release you trust or build the source yourself.

## First launch

1. Download the ZIP or DMG matching your Mac from [Releases](https://github.com/gsn943314/Oto/releases/latest): **arm64** for Apple Silicon, **x64** for Intel.
2. Extract the ZIP or open the DMG. Move **Oto.app** into **Applications** before opening it.
3. Try opening Oto once. If macOS blocks it, dismiss the message.
4. Open **Apple menu → System Settings → Privacy & Security**. Scroll to **Security**, find the message about Oto, and choose **Open Anyway** (the wording varies by macOS version).
5. Authenticate with your Mac's login password or Touch ID if requested, then confirm **Open**. Try opening the app again if necessary.

The exception is for this app; do not disable Gatekeeper globally. If Open Anyway is missing, try launching Oto again and return to Privacy & Security soon afterward. Managed Macs may require the administrator's help. Do not treat a warning that macOS has detected malware as a routine unidentified-developer warning.

These steps follow [Apple's opening instructions](https://support.apple.com/en-gb/102445) and [Privacy & Security instructions](https://support.apple.com/en-gb/guide/mac-help/mh40617/mac).

## Set up dictation

1. Open Oto's **Settings**, enter **your own OpenAI API key**, and save. Your account needs access to `gpt-transcribe` and available API quota.
2. Allow **Microphone** access when prompted. You can review it under **System Settings → Privacy & Security → Microphone**.
3. For a global trigger and automatic paste, enable **Oto** under **System Settings → Privacy & Security → Accessibility**. Oto's Settings also has a button to open that pane. If necessary, add `/Applications/Oto.app` with the **+** button.
4. Choose Control, fn, or Right Option as the trigger. Focus a text field in another app, tap the key, speak, and tap again to transcribe.

## Updating or rebuilding

Quit the old app before replacing it. The app keeps its existing local data directory (`voice-input-app`) to preserve saved keys and history. That legacy name may also remain on the existing Safe Storage Keychain item; it is separate from the app's displayed name, **Oto**.

Ad-hoc signatures can change identity after a rebuild. macOS may ask for Microphone, Accessibility, or Keychain access again. If Accessibility stops working, remove the old app entry and add the installed Oto.app again. If macOS asks for Safe Storage access, it is asking to unlock the encryption key used for your saved API key; authenticate in the macOS dialog, not in a GitHub issue or chat.

Consistent certificate-based signing is needed for a stable signing identity across updates. These unsigned-by-Apple community releases do not promise that permissions will persist. See [Electron's signing explanation](https://www.electronjs.org/docs/latest/tutorial/code-signing).

## Optional integrity check

Each release includes `SHA256SUMS.txt`. To compare a downloaded archive with its listed checksum:

```sh
shasum -a 256 Oto-1.1.1-arm64.zip
```

For an installed app:

```sh
codesign --verify --deep --strict /Applications/Oto.app
```

An ad-hoc signature checks bundle integrity; it does not establish a verified developer identity or Apple notarization.
