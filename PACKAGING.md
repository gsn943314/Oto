# Packaging for macOS

Follow the [README prerequisites](README.md#build-from-source), then run `npm ci` and `npm run check`.

```sh
npm run package:mac -- --arm64
npm run package:mac -- --x64
```

Omit the architecture flag to build both. Outputs are named `OTO-<version>-<architecture>.dmg` and `.zip` in `release/`. `npm run package:mac:dir -- --arm64` builds an unpacked `.app` for local checks.

The build compiles the Swift helper as a universal binary, generates the icon, builds React and Electron, and signs each app inside out with an ad-hoc signature. This is not Apple notarization. No signing certificates or API keys are needed to build. A new signature may require users to grant Accessibility or Keychain access again.

Only compiled app files, package metadata, runtime dependencies, and the native helper enter the app bundle. Local user data, history, API keys, and logs are not copied into it. Check the app bundle and release archive before publishing. Test first launch with an isolated user-data directory so personal settings cannot hide setup problems.

## Publishing a release

GitHub Actions builds both architectures from the committed source, runs the type checks and mocked API tests, and publishes a source ZIP plus checksums. Run the **Release** workflow manually, or push a main-branch commit whose message contains `[release]`. Its version comes from `package.json`. Bump that version before the next release; the workflow refuses to overwrite a published release. An existing draft is replaced with the current verified artifacts before publication.

The workflow uses GitHub's built-in `GITHUB_TOKEN`; do not add your OpenAI API key or local signing key to the workflow. Community release builds use ad-hoc signatures.

Packaging commands explicitly disable electron-builder auto-publishing. Only the Release workflow's final step uploads artifacts, after the source ZIP and checksums are ready.
