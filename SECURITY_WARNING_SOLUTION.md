# Opening an unnotarized macOS build

The downloadable community builds are ad-hoc signed and are not notarized by Apple. macOS may block first launch. Only open a build you trust, preferably from this repository's Releases, or build it from source.

After trying to open the app, go to **System Settings → Privacy & Security**, find the blocked-app message, and choose **Open Anyway** if available. Follow the macOS confirmation prompts. Do not disable Gatekeeper system-wide.

For a local build you made yourself, verify the signature with:

```sh
codesign --verify --deep --strict /Applications/Oto.app
```

A valid ad-hoc signature checks bundle integrity; it does not establish a verified developer identity or Apple notarization.

For recording, allow Microphone permission. For the global trigger and automatic paste, enable the app in Accessibility. After replacing an app with a rebuilt version, you may need to remove its old Accessibility entry and add the new app. If macOS asks for access to the app's Safe Storage Keychain entry, it is requesting access to the stored local API key.
