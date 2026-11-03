#!/bin/bash
# Reuse a local certificate when configured; community CI builds use ad-hoc signing.
set -euo pipefail
APP="${1:-release/mac-arm64/Oto.app}"
IDENTITY="${OTO_SIGNING_IDENTITY:-}"
if [[ -z "$IDENTITY" && "${CI:-}" != "true" ]]; then
  IDENTITY="$(security find-identity -v -p codesigning | awk '/"Oto Local Development"/ { print $2; exit }')"
fi
IDENTITY="${IDENTITY:--}"
for f in "$APP"/Contents/Frameworks/*; do
  codesign --force --deep --sign "$IDENTITY" "$f"
done
codesign --force --sign "$IDENTITY" --identifier com.voiceinput.app.helper "$APP/Contents/Resources/native/voiceinput-helper"
codesign --force --sign "$IDENTITY" --identifier com.voiceinput.app "$APP"
codesign --verify --deep --strict "$APP"
if [[ "$IDENTITY" == "-" ]]; then
  echo "signed $APP (ad-hoc; macOS may request permission after rebuilding)"
else
  echo "signed $APP with a consistent certificate identity"
fi
