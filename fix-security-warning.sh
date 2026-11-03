#!/bin/bash
# Print the supported opening steps; do not remove quarantine or disable Gatekeeper.
set -euo pipefail
cat <<'GUIDE'
Move Oto.app into Applications and try opening it once.
If blocked, open System Settings > Privacy & Security > Open Anyway for Oto.
Authenticate and confirm Open in the macOS dialog.
Then allow Microphone and Accessibility for dictation.
See SECURITY_WARNING_SOLUTION.md for the full guide.
GUIDE
