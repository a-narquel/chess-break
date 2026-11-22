# chess-break

A Claude Code mod that keeps you thinking between prompts instead of reaching for your phone.

When you send a prompt, a **Chess break** pane opens with one of 682 mate-in-1 or mate-in-2 puzzles,
drawn as a full chess board that grows to fill the pane (click the pane's expand button for the
largest board). When Claude replies, the pane shows **Claude's done** with two buttons:
**Back to conversation** closes the pane, **Finish puzzle** lets you keep playing.

How you move, by where you run Claude Code:

| Where | Board | Moving |
| --- | --- | --- |
| Desktop app, claude.ai in a browser | drawn board | drag a piece, click piece then square, or the tap buttons |
| VS Code, phone app | drawn board | tap a piece button, then a square button |
| Terminal | board in text cells | drag or click with the mouse |

Your streak and place in the puzzle set are kept between sessions. `/chess` opens the pane.

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
