#!/usr/bin/env python3
"""Bake puzzles/puzzles.json into the board page and the mod.

Writes board/index.html (the drag-and-drop page, published as a claude.ai
artifact) and hooks/puzzles.ts (the puzzles the in-Claude pane uses).
Run from the repository root:  python3 tools/build.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
puzzles = json.loads((ROOT / "puzzles/puzzles.json").read_text())
pieces = {}
for name in ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"]:
    svg = (ROOT / "board/pieces" / f"{name}.svg").read_text().strip()
    svg = svg.replace('style="color-scheme:light only" ', "")
    pieces[name[1].upper() if name[0] == "w" else name[1].lower()] = svg

page = (ROOT / "board/template.html").read_text()
page = page.replace("__PUZZLES__", json.dumps(puzzles, separators=(",", ":")))
page = page.replace("__PIECES__", json.dumps(pieces))
(ROOT / "board/index.html").write_text(page)
(ROOT / "hooks/puzzles.ts").write_text(
    "import type { Puzzle } from './chess'\n\nexport const PUZZLES: Puzzle[] = "
    + json.dumps(puzzles, separators=(",", ":")) + "\n"
)
ones = sum(1 for p in puzzles if p["n"] == 1)
print(f"{len(puzzles)} puzzles ({ones} mate in 1, {len(puzzles) - ones} mate in 2)")
print("wrote board/index.html and hooks/puzzles.ts")
