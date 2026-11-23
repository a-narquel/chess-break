# Chess break: back to Claude (browser extension)

Web pages can't switch you to another open tab; browser extensions can. With this installed,
**Back to Claude** on the chess board switches to your open Claude Code tab instead of opening a
new one, and with **Stop me when Claude replies** ticked, Claude's reply switches you back by itself.

## Install (Brave, Chrome, Edge)

1. Download or clone this repository.
2. Open `brave://extensions` (or `chrome://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose this `extension` folder.

It asks for the `tabs` permission (to find and switch to your Claude tab) and runs only on
claude.ai pages, where the board lives. Nothing is sent anywhere.

## Publishing to the stores

`python3 tools/package_extension.py` builds `dist/chess-break-chrome.zip` (Chrome Web Store:
Chrome, Brave, Edge, Opera) and `dist/chess-break-firefox.zip` (Firefox Add-ons). The listing
text, permission justifications and privacy answers are in `store/STORE.md`; the screenshot and
icon are in `store/` and `icons/`.
