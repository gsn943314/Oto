#!/bin/bash
# Builds the native helper (global trigger key + paste) as a universal binary into build/native/
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=build/native
mkdir -p "$OUT"
for arch in arm64 x86_64; do
  swiftc -O -target "$arch-apple-macos11" native/voiceinput-helper.swift -o "$OUT/voiceinput-helper-$arch"
done
lipo -create "$OUT/voiceinput-helper-arm64" "$OUT/voiceinput-helper-x86_64" -output "$OUT/voiceinput-helper"
rm "$OUT/voiceinput-helper-arm64" "$OUT/voiceinput-helper-x86_64"
codesign --force --sign - "$OUT/voiceinput-helper"
echo "built $OUT/voiceinput-helper"
