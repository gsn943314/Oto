#!/bin/bash

# Script to generate macOS icon from SVG
# Uses Electron/Chromium, sips, and iconutil

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
BUILD_DIR="$PROJECT_DIR/build"
ICON_SVG="$BUILD_DIR/icon.svg"
ICON_PNG="$BUILD_DIR/icon.png"
ICONSET_DIR="$BUILD_DIR/icon.iconset"
ICON_ICNS="$BUILD_DIR/icon.icns"

echo "🎨 Building macOS application icon..."

# Check if SVG exists
if [ ! -f "$ICON_SVG" ]; then
    echo "❌ Error: icon.svg not found in build directory"
    exit 1
fi

# Electron renders the editable SVG; only built-in macOS tools are needed after this.
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron scripts/render-icon.cjs "$ICON_SVG" "$ICON_PNG"

# Create iconset directory
echo "📦 Creating iconset..."
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Generate all required icon sizes
sips -z 16 16     "$ICON_PNG" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null 2>&1
sips -z 32 32     "$ICON_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null 2>&1
sips -z 32 32     "$ICON_PNG" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null 2>&1
sips -z 64 64     "$ICON_PNG" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null 2>&1
sips -z 128 128   "$ICON_PNG" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null 2>&1
sips -z 256 256   "$ICON_PNG" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null 2>&1
sips -z 256 256   "$ICON_PNG" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null 2>&1
sips -z 512 512   "$ICON_PNG" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null 2>&1
sips -z 512 512   "$ICON_PNG" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null 2>&1
sips -z 1024 1024 "$ICON_PNG" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null 2>&1

# Convert iconset to icns
echo "🔨 Converting iconset to icns..."
iconutil -c icns "$ICONSET_DIR" -o "$ICON_ICNS"

# Clean up
echo "🧹 Cleaning up..."
rm -rf "$ICONSET_DIR"

echo "✅ Icon generated successfully: $ICON_ICNS"
echo ""
echo "You can now run: npm run package:mac"
