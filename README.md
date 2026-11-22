# chess-break

A Claude Code mod that keeps you thinking between prompts instead of reaching for your phone.

When you send a prompt, a **Chess break** pane opens beside the conversation with one of 682
mate-in-1 or mate-in-2 puzzles, drawn as a full chess board that fills the pane (drag its edge
or click its expand button for a bigger board; **Bigger** and **Smaller** fine-tune it). When
Claude replies, **Claude's done** appears with **Back to conversation**, which closes the pane, and
**Finish puzzle**, which keeps it open. `/chess` opens the pane any time.

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

## Credits and license

The chess pieces are the Cburnett set by [Colin M.L. Burnett](https://en.wikipedia.org/wiki/User:Cburnett),
as shipped by [Lichess](https://github.com/lichess-org/lila), licensed GPL-2.0-or-later.
chess-break is therefore released under the GNU General Public License, version 2 or (at your
option) any later version: see `LICENSE`.
