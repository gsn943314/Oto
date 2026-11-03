#!/bin/bash

# Fix macOS Gatekeeper Security Warning
# Usage: bash fix-security-warning.sh

echo "🔧 Removing quarantine attribute from Oto..."

# Check if app exists
if [ ! -d "/Applications/Oto.app" ]; then
    echo "❌ Error: Oto.app not found in /Applications"
    echo "Please install the app first"
    exit 1
fi

# Remove quarantine attribute
sudo xattr -cr /Applications/Oto.app

if [ $? -eq 0 ]; then
    echo "✅ Success! Oto can now be opened normally"
    echo ""
    echo "Launching the app..."
    open /Applications/Oto.app
else
    echo "❌ Failed: Administrator permission required"
    echo "Please run: sudo xattr -cr /Applications/Oto.app"
fi
