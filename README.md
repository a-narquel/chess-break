# chess-break

A Claude Code mod that keeps you thinking between prompts instead of reaching for your phone.
When you submit a prompt, a "Chess break" pane opens beside the chat with one of 682 mate-in-1 or
mate-in-2 puzzles. On the desktop app and in the terminal you drag pieces; in VS Code and on mobile
you click a piece, then its square. When Claude replies, the pane and a toast send you back.
Progress and your streak are kept between sessions. `/chess` opens the pane by hand.
Puzzles come from computer self-play, checked with python-chess: each has exactly one solution.

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
