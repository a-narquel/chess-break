# chess-break

A Claude Code mod that keeps you thinking between prompts instead of reaching for your phone.

When you send a message, the mod asks Claude to open the **chess board page** first thing, so it
appears beside the conversation while Claude works: one of 682 mate-in-1 or mate-in-2 puzzles with
real drag and drop, move sounds and animations. A **Play a puzzle** link above the prompt box
opens it too. When Claude replies, a notification tells you it's done.

The board page is `board/index.html`, published as a claude.ai artifact. `/chess` also opens a
simpler board in a side pane inside Claude Code.

How you move, by where you run Claude Code:

| Where | Board | Moving |
| --- | --- | --- |
| Desktop app, claude.ai in a browser | drawn board | drag a piece, click piece then square, or the tap buttons |
| VS Code, phone app | drawn board | tap a piece button, then a square button |
| Terminal | board in text cells | drag or click with the mouse |

Your streak and place in the puzzle set are kept between sessions.

Puzzles come from computer self-play, each checked with python-chess to have exactly one solution.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install chess-break --marketplace a-narquel/chess-break
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```bash
claude plugin install chess-break --marketplace a-narquel/chess-break
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `a-narquel/chess-break`, then Add plugin.

## Puzzles

There are 682: 519 mate in 1 and 163 mate in 2, made from computer self-play and checked with
python-chess (`tools/generate.py`). They live in `puzzles/puzzles.json`.

To add more, use the [Lichess puzzle database](https://database.lichess.org/#puzzles), free under
CC0, with over 4 million rated puzzles:

```bash
pip install chess zstandard
python3 tools/import_lichess.py lichess_db_puzzle.csv.zst --count 2000 --min-rating 800 --max-rating 1800
python3 tools/build.py
```

`build.py` writes `board/index.html` and `hooks/puzzles.ts`. Then ask Claude to republish
`board/index.html` to the board's artifact so the page picks them up.

## Credits and license

The chess pieces are the Cburnett set by [Colin M.L. Burnett](https://en.wikipedia.org/wiki/User:Cburnett),
as shipped by [Lichess](https://github.com/lichess-org/lila), licensed GPL-2.0-or-later.
chess-break is therefore released under the GNU General Public License, version 2 or (at your
option) any later version: see `LICENSE`.
