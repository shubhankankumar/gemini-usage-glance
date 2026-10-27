# Gemini Usage Glance

Chrome extension (Manifest V3) that shows your Gemini 5-hour and weekly usage in the toolbar popup.

It reads the percentages from `https://gemini.google.com/usage`, either from a tab you already have open or from a background tab it opens and closes again. Nothing is stored or sent anywhere.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.

## Files

- `manifest.json`: permissions (`scripting` and `gemini.google.com` only)
- `background.js`: finds or opens the usage page and scrapes it with `chrome.scripting`
- `popup.html` / `popup.js`: the UI
