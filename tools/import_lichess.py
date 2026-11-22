#!/usr/bin/env python3
"""Add mate-in-1 and mate-in-2 puzzles from the Lichess puzzle database.

The database is free under CC0: https://database.lichess.org/#puzzles
Download lichess_db_puzzle.csv.zst, then for example:

    pip install chess zstandard
    python3 tools/import_lichess.py lichess_db_puzzle.csv.zst --count 2000 --min-rating 800 --max-rating 1800
    python3 tools/build.py

Each puzzle is checked with python-chess. Mate in 1 accepts every mating
move; mate in 2 keeps Lichess's line and accepts every mating final move.
New puzzles are added after the existing ones in puzzles/puzzles.json,
skipping positions already there.
"""
import argparse
import csv
import io
import json
import random
from pathlib import Path

import chess

ROOT = Path(__file__).resolve().parent.parent


def rows(path):
    if path.endswith(".zst"):
        import zstandard
        raw = open(path, "rb")
        text = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(raw), encoding="utf-8")
    else:
        text = open(path, encoding="utf-8")
    yield from csv.DictReader(text)


def mates(board):
    found = []
    for move in board.legal_moves:
        board.push(move)
        if board.is_checkmate():
            found.append(move.uci())
        board.pop()
    return found


def convert(row):
    """A Lichess row as this project's puzzle, or None when it is not one."""
    themes = row["Themes"].split()
    n = 1 if "mateIn1" in themes else 2 if "mateIn2" in themes else 0
    if not n:
        return None
    board = chess.Board(row["FEN"])
    moves = row["Moves"].split()
    board.push_uci(moves[0])  # Lichess's FEN is before the opponent's last move
    fen = board.fen()
    line = moves[1:]
    if n == 1 and len(line) == 1:
        answers = mates(board)
        return {"fen": fen, "n": 1, "a": answers} if line[0] in answers else None
    if n == 2 and len(line) == 3:
        board.push_uci(line[0])
        board.push_uci(line[1])
        finals = mates(board)
        if line[2] not in finals:
            return None
        return {"fen": fen, "n": 2, "a": [line[0]], "r": line[1], "b": finals}
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", help="lichess_db_puzzle.csv or .csv.zst")
    ap.add_argument("--count", type=int, default=1000, help="how many new puzzles to add")
    ap.add_argument("--min-rating", type=int, default=0)
    ap.add_argument("--max-rating", type=int, default=4000)
    ap.add_argument("--mate2-share", type=float, default=0.5, help="share of mate-in-2 among the new ones")
    args = ap.parse_args()

    out = ROOT / "puzzles/puzzles.json"
    puzzles = json.loads(out.read_text())
    seen = {p["fen"].split(" ")[0] for p in puzzles}
    want2 = round(args.count * args.mate2_share)
    want1 = args.count - want2
    got1, got2 = [], []
    for row in rows(args.csv):
        if len(got1) >= want1 and len(got2) >= want2:
            break
        if not args.min_rating <= int(row["Rating"]) <= args.max_rating:
            continue
        p = convert(row)
        if p is None or p["fen"].split(" ")[0] in seen:
            continue
        bucket, want = (got1, want1) if p["n"] == 1 else (got2, want2)
        if len(bucket) < want:
            bucket.append(p)
            seen.add(p["fen"].split(" ")[0])
    new = got1 + got2
    random.shuffle(new)
    out.write_text(json.dumps(puzzles + new, separators=(",", ":")))
    print(f"added {len(got1)} mate in 1 and {len(got2)} mate in 2; {len(puzzles) + len(new)} in all")


if __name__ == "__main__":
    main()
