# App icon

`icon.svg` is the editable source. `npm run build:icon` renders it with Electron/Chromium and uses macOS `sips` and `iconutil` to create `icon.png` and `icon.icns`. Generated icon files stay outside Git; packaging regenerates them automatically. No ImageMagick installation is required.
