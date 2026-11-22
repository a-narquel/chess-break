# chess-break

A Claude Code mod that keeps you thinking between prompts instead of reaching for your phone.

When you send a prompt, a chess board appears right in the conversation, between the chat and
the prompt box, with one of 682 mate-in-1 or mate-in-2 puzzles. It stays in place while Claude's
reply scrolls above it. When Claude replies, **Claude's done** appears beside the board with two
buttons: **Back to conversation** puts the board away until your next prompt, **Finish puzzle**
lets you keep playing. `/chess` also opens the board in a side pane, if you ever want that.

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
