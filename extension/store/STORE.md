# Store listing: Chess break, back to Claude

Text to paste into the Chrome Web Store and Firefox Add-ons forms.

**Name:** Chess break: back to Claude

**Summary (up to 132 characters):**
Solve chess puzzles while Claude works, then jump straight back to your open Claude tab when the reply is ready.

**Category:** Productivity (Chrome) · Games or Productivity (Firefox)

**Description:**
Chess break turns the wait between Claude Code prompts into a quick chess puzzle instead of a
phone break. This extension is the companion to the Chess break board
(https://github.com/a-narquel/chess-break): when Claude replies, "Back to Claude" on the board
switches you to the Claude tab you already have open, instead of opening a new one. Tick "Stop me
when Claude replies" on the board and it switches you back automatically the moment the reply lands.

It does nothing on any other site and collects nothing.

**Single purpose (Chrome):**
Switch the browser to the user's open Claude tab when they choose Back to Claude on the Chess break
board, or when Claude replies with "Stop me when Claude replies" turned on.

**Permission justification (Chrome):**
- `tabs`: to find the user's open claude.ai/code tab and switch to it. No tab contents are read.
- Content script on claude.ai and claudeusercontent.com: to notice the board's Back to Claude
  button and its "Claude replied" overlay. It reads nothing else on the page.

**Data use / privacy:**
The extension collects, stores and sends no data. It has no network access of its own and no
analytics. Privacy policy text: "Chess break: back to Claude does not collect, store or transmit
any personal or usage data."

**Remote code:** No. All code ships in the package.

**Screenshot:** store/screenshot-1280x800.png
**Icon:** icons/icon128.png

## Submitting

- Chrome Web Store: https://chrome.google.com/webstore/devconsole (one-time $5 developer fee).
  Upload dist/chess-break-chrome.zip. Brave, Edge and Opera users can install it from there too.
- Firefox Add-ons: https://addons.mozilla.org/developers/ (free). Upload
  dist/chess-break-firefox.zip. Firefox asks for the source only for minified code; this is not.
