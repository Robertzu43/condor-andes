#!/bin/sh
# Renders cover.html with headless Chrome into og.png (share card), logo.png, apple-touch-icon.png, favicon.png.
cd "$(dirname "$0")/.."
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() { "$CH" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size="$2" --virtual-time-budget=4000 --screenshot="$3" "file://$PWD/cover.html?$1" 2>/dev/null; }
shot "kind=cover" 1200,630 og.png
shot "kind=logo&size=512" 512,512 logo.png
shot "kind=logo&size=180" 180,180 apple-touch-icon.png
shot "kind=logo&size=64" 64,64 favicon.png
ls -la og.png logo.png apple-touch-icon.png favicon.png
