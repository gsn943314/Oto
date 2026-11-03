# Packaging for macOS

Follow the [README prerequisites](README.md#build-from-source), then run `npm ci` and `npm run check`.

```sh
npm run package:mac -- --arm64
npm run package:mac -- --x64
```

Omit the architecture flag to build both. Outputs are named `Oto-<version>-<architecture>.dmg` and `.zip` in `release/`. `npm run package:mac:dir -- --arm64` builds an unpacked `.app` for local checks.

The build compiles the Swift helper as a universal binary, generates the icon, builds React and Electron, and signs each app inside out. By default, community builds use ad-hoc signatures; no signing certificates or API keys are needed to build. This is not Apple notarization. Ad-hoc rebuilds can require granting Accessibility or Keychain access again.

For local development, the signing script reuses a code-signing identity named `Oto Local Development` from your login Keychain when present. You can select another identity with `OTO_SIGNING_IDENTITY=<certificate SHA-1>`, or force ad-hoc signing with `OTO_SIGNING_IDENTITY=-`. Keep the certificate and its private key on your Mac. CI does not auto-select this identity. Switching from an old signature can require one final permission grant; subsequent builds must use the same identity, bundle identifier, and installation path to preserve the app’s signing identity. macOS still controls permission and Keychain decisions.

Only compiled app files, package metadata, runtime dependencies, and the native helper enter the app bundle. Local user data, history, API keys, and logs are not copied into it. Check the app bundle and release archive before publishing. Test first launch with an isolated user-data directory so personal settings cannot hide setup problems.

## Publishing a release

GitHub Actions builds both architectures from the committed source, runs the type checks and mocked API tests, and publishes a source ZIP plus checksums. Run the **Release** workflow manually, or push a main-branch commit whose message contains `[release]`. Its version comes from `package.json`. Bump that version before the next release; the workflow refuses to overwrite a published release. An existing draft is replaced with the current verified artifacts before publication.

The workflow uses GitHub's built-in `GITHUB_TOKEN`; do not add your OpenAI API key or local signing key to the workflow. Community release builds use ad-hoc signatures.

Packaging commands explicitly disable electron-builder auto-publishing. Only the Release workflow's final step uploads artifacts, after the source ZIP and checksums are ready.
