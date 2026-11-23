#!/usr/bin/env python3
"""Build the store packages for the Back to Claude extension.

    python3 tools/package_extension.py

Writes dist/chess-break-chrome.zip (Chrome Web Store: Chrome, Brave, Edge,
Opera) and dist/chess-break-firefox.zip (Firefox Add-ons). The two differ
only in the manifest: Chrome runs the background as a service worker,
Firefox as a background script, and Firefox needs an add-on id.
"""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXT = ROOT / "extension"
DIST = ROOT / "dist"
FILES = ["board.js", "background.js", "icons/icon16.png", "icons/icon32.png", "icons/icon48.png", "icons/icon128.png"]

base = json.loads((EXT / "manifest.json").read_text())

chrome = dict(base)

firefox = dict(base)
firefox["background"] = {"scripts": ["background.js"]}
firefox["browser_specific_settings"] = {
    "gecko": {
        "id": "chess-break@a-narquel.github.io",
        "strict_min_version": "121.0",
        "data_collection_permissions": {"required": ["none"]},
    }
}

DIST.mkdir(exist_ok=True)
for name, manifest in [("chrome", chrome), ("firefox", firefox)]:
    out = DIST / f"chess-break-{name}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest, indent=2) + "\n")
        for f in FILES:
            z.write(EXT / f, f)
    print(f"wrote {out.relative_to(ROOT)}")
