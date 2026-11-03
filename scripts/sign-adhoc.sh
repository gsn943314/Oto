#!/bin/bash
# Signs local builds inside out without a Developer ID. This is not notarization;
# rebuilding may require granting macOS permissions again.
set -euo pipefail
APP="${1:-release/mac-arm64/OTO.app}"
for f in "$APP"/Contents/Frameworks/*; do
  codesign --force --deep --sign - "$f"
done
codesign --force --sign - --identifier com.voiceinput.app.helper "$APP/Contents/Resources/native/voiceinput-helper"
codesign --force --sign - --identifier com.voiceinput.app "$APP"
codesign --verify --deep --strict "$APP"
echo "signed $APP"
