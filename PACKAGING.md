# Packaging for macOS

Follow the [README prerequisites](README.md#build-from-source), then run `npm ci` and `npm run check`.

```sh
npm run package:mac -- --arm64
npm run package:mac -- --x64
```

Omit the architecture flag to build both. Outputs are named `Oto-<version>-<architecture>.dmg` and `.zip` in `release/`. `npm run package:mac:dir -- --arm64` builds an unpacked `.app` for local checks.

The build compiles the Swift helper as a universal binary, generates the icon, builds React and Electron, and signs each app inside out with an ad-hoc signature. This is not Apple notarization. No signing certificates or API keys are needed to build. A new signature may require users to grant Accessibility or Keychain access again.

Only compiled app files, package metadata, runtime dependencies, and the native helper enter the app bundle. Local user data, history, API keys, and logs are not copied into it. Check the app bundle and release archive before publishing. Test first launch with an isolated user-data directory so personal settings cannot hide setup problems.
