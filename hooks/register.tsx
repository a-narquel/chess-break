import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderInput } from 'claude-code'

import type { Drag, Game, Stats, Working } from '../types'
import type { BoardProps } from './board'
import { applyMove, FILES, glyph, isWhite, matches, parseFen, san, targets } from './chess'
import type { Board, Puzzle } from './chess'
import { PUZZLES } from './puzzles'
import { boardSvg } from './svg'

const PANE = 'chess-break'
const TITLE = 'Chess break'

const fresh = (index: number): Game => ({
  index: ((index % PUZZLES.length) + PUZZLES.length) % PUZZLES.length,
  stage: 0,
  selected: null,
  message: '',
  tone: 'plain',
  isSolved: false,
  hinted: false,
  missed: false,
  line: [],
  startedAt: 0,
  wrongSq: null,
})

const game = atom({ plugin: 'chess-break', key: 'game' } as const, fresh(0), { shape: 'game-3' })
const stats = atom({ plugin: 'chess-break', key: 'stats' } as const, { solved: 0, streak: 0, best: 0 }, { shape: 'stats-1' })
const working = atom({ plugin: 'chess-break', key: 'working' } as const, 'idle' as Working)
const paneOpen = atom({ plugin: 'chess-break', key: 'paneOpen' } as const, false)
const zoom = atom({ plugin: 'chess-break', key: 'zoom' } as const, 1)
const dragging = atom({ plugin: 'chess-break', key: 'drag' } as const, null as Drag)

// A click can reach both the drag layer and the square's button beneath it:
// the second report of the same square within a moment is the same click.
let lastTap = { sq: '', at: 0 }

const puzzle = (index: number): Puzzle => PUZZLES[index] ?? (PUZZLES[0] as Puzzle)
const expected = (p: Puzzle, g: Game) => (g.stage === 0 ? p.a : (p.b ?? []))

function position(g: Game) {
  const p = puzzle(g.index)
  const start = parseFen(p.fen)
  const board = g.line.reduce<Board>((b, m) => applyMove(b, m), start.board)
  const last = g.line[g.line.length - 1]
  return { p, board, toMove: start.turn, last: last ? [last.slice(0, 2), last.slice(2, 4)] : [] }
}

// Display index (row-major, top-left first) to square, with the side to move at the bottom.
function squareAt(idx: number, flip: boolean): string {
  const r = Math.floor(idx / 8)
  const c = idx % 8
  return `${flip ? FILES[7 - c] : FILES[c]}${flip ? r + 1 : 8 - r}`
}

async function save($: EngineInterface) {
  await $.store.set('index', (await read($, game)).index)
  await $.store.set('stats', await read($, stats))
}

async function open($: EngineInterface) {
  await update($, paneOpen, () => true)
  return $.ui.open({ id: PANE, title: TITLE, columns: 240 })
}

// The time, or 0 where it cannot be read: the timer is a nicety, never a reason to drop a move.
async function nowMs($: EngineInterface): Promise<number> {
  return $.clock.now().catch(() => 0)
}

function clockText(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

async function move($: EngineInterface, from: string, to: string) {
  const now = await nowMs($)
  let outcome = 'none' as 'none' | 'wrong' | 'solved'
  await update($, game, g => {
    if (g.isSolved) return g
    const { p, board } = position(g)
    const m = matches(expected(p, g), from, to)
    if (m === undefined) {
      outcome = 'wrong'
      return { ...g, selected: null, missed: true, wrongSq: to, tone: 'bad' as const, message: `${san(board, from + to)} doesn't force mate. Try again.` }
    }
    if (g.stage === 0 && p.n === 2 && p.r !== undefined) {
      const after = applyMove(board, m)
      return {
        ...g, stage: 1 as const, selected: null, wrongSq: null, line: [m, p.r], tone: 'good' as const,
        message: `${san(board, m)}! They reply ${san(after, p.r)}. Now finish it.`,
      }
    }
    outcome = 'solved'
    return {
      ...g, stage: 2 as const, selected: null, wrongSq: null, isSolved: true, line: [...g.line, m], tone: 'good' as const,
      message: `${san(board, m)}# Checkmate!${g.startedAt > 0 && now > 0 ? ` Solved in ${clockText(now - g.startedAt)}.` : ''}`,
    }
  })
  const g = await read($, game)
  if (outcome === 'solved') {
    await update($, stats, s => {
      const streak = g.hinted || g.missed ? 0 : s.streak + 1
      return { solved: s.solved + 1, streak, best: Math.max(s.best, streak) }
    })
  } else if (outcome === 'wrong') {
    await update($, stats, s => ({ ...s, streak: 0 }))
  }
  await save($)
}

async function tap($: EngineInterface, sq: string) {
  const now = await nowMs($)
  if (lastTap.sq === sq && now - lastTap.at < 400) return
  lastTap = { sq, at: now }
  const g = await read($, game)
  if (g.isSolved) return
  const { board, toMove } = position(g)
  const piece = board[sq]
  const isOwn = piece !== undefined && isWhite(piece) === (toMove === 'w')
  if (isOwn) {
    await update($, game, x => ({ ...x, wrongSq: null, selected: x.selected === sq ? null : sq }))
  } else if (g.selected !== null) {
    await move($, g.selected, sq)
  }
}

async function nextPuzzle($: EngineInterface) {
  const g = await read($, game)
  if (!g.isSolved) await update($, stats, s => ({ ...s, streak: 0 }))
  const now = await nowMs($)
  await update($, game, x => ({ ...fresh(x.index + 1), startedAt: now }))
  await save($)
}

async function showSolution($: EngineInterface) {
  const g = await read($, game)
  const p = puzzle(g.index)
  const b0 = parseFen(p.fen).board
  const first = p.a[0] ?? ''
  let text = san(b0, first)
  if (p.n === 2 && p.r && p.b) {
    const b1 = applyMove(b0, first)
    text += `  ${san(b1, p.r)}  ${san(applyMove(b1, p.r), p.b[0] ?? '')}`
  }
  await update($, stats, s => ({ ...s, streak: 0 }))
  await update($, game, x => ({ ...x, hinted: true, tone: 'plain' as const, message: `Solution: ${text}#` }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'chess', description: 'Open the chess puzzle pane' })
    const storedZoom = await $.store.get('zoom')
    if (typeof storedZoom === 'number') await update($, zoom, () => storedZoom)
    const storedIndex = await $.store.get('index')
    const storedStats = (await $.store.get('stats')) as Stats | undefined
    const g = await read($, game)
    if (typeof storedIndex === 'number' && g.index === 0 && g.line.length === 0) {
      await update($, game, () => fresh(storedIndex))
    }
    if (storedStats && typeof storedStats.solved === 'number') {
      await update($, stats, s => (s.solved >= storedStats.solved ? s : storedStats))
    }
    return next(e)
  })

  on('command.run', { command: 'chess' }, async $ => {
    await open($)
    return { text: 'Chess pane opened.' }
  })

  on('prompt.submit', async ($, e, next) => {
    const ran = await next(e)
    await update($, working, () => 'working' as Working)
    const now = await nowMs($)
    await update($, game, x => (x.startedAt === 0 && !x.isSolved ? { ...x, startedAt: now } : x))
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const was = await read($, working)
    await update($, working, () => 'done' as Working)
    if (was === 'working') {
      const text = "♟ Claude's done. Go back to the conversation, or finish your puzzle first."
      const sent = await $.ui.notify(text, { title: 'Claude replied' }).catch(() => ({ isSent: false }))
      if (!sent.isSent) $.ui.toast(text)
    }
    return next(e)
  })

  on('ui.message', async ($, e) => {
    const d = e.data as { type?: unknown; idx?: unknown; from?: unknown; to?: unknown } | null
    const g = await read($, game)
    const flip = position(g).toMove === 'b'
    const ok = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 64
    const over = (d as { over?: unknown } | null)?.over
    if (d?.type === 'drag' && ok(d.from) && ok(over)) {
      const from = d.from
      await update($, dragging, () => ({ from: squareAt(from, flip), over: squareAt(over, flip) }))
    }
    if (d?.type === 'tap' && ok(d.idx)) {
      await update($, dragging, () => null)
      await tap($, squareAt(d.idx, flip))
    }
    if (d?.type === 'move' && ok(d.from) && ok(d.to)) {
      await update($, dragging, () => null)
      lastTap = { sq: '', at: 0 }
      await move($, squareAt(d.from, flip), squareAt(d.to, flip))
    }
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => drawGame($, e, 'pane'))

  // However the pane closes (its own button, the close mark, Esc), the band takes the board back.
  on('ui.close', async ($, e, next) => {
    const done = await next(e)
    if (e.id === PANE) await update($, paneOpen, () => false)
    return done
  })

  // The board's home: the band between the conversation and the prompt box,
  // as wide as the conversation, shown from a prompt until you go back.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const w = await read($, working)
    if (e.props.hasSurvey || w === 'idle') return next(e)
    if (await read($, paneOpen)) return next(e)
    return drawGame($, e, 'band')
  })
}

async function drawGame($: EngineInterface, e: RenderInput<'Pane' | 'AbovePrompt'>, place: 'pane' | 'band') {
    const g = await read($, game)
    const s = await read($, stats)
    const w = await read($, working)
    const drag = await read($, dragging)
    const { p, board, toMove, last } = position(g)
    const flip = toMove === 'b'
    const hint = g.hinted && !g.isSolved ? expected(p, g)[0]?.slice(0, 2) : undefined
    const squares = Array.from({ length: 64 }, (_, i) => squareAt(i, flip))
    const loser = toMove === 'w' ? 'k' : 'K'
    const mateSq = g.isSolved ? Object.keys(board).find(sq => board[sq] === loser) : undefined
    const markOf = (sq: string) =>
      sq === mateSq ? 'mate'
      : sq === g.wrongSq ? 'bad'
      : drag && sq === drag.over && sq !== drag.from ? 'over'
      : sq === g.selected || (drag && sq === drag.from) ? 'sel'
      : sq === hint ? 'hint'
      : last.includes(sq) ? 'last'
      : ''
    const MARK: Record<string, string> = { sel: '#e9cf4a', hint: '#5fb0ef', last: '#d6cf7a', over: '#f6f2e2', mate: '#e06a5a', bad: '#e88b7d' }

    // A text cell is about 2.4 times taller than wide, so a square is 2.4 columns per row.
    // Fill the pane's width, leaving rows under the board for the text and buttons.
    const cols = e.props.bodyColumns ?? 40
    const roomRows = 'maxRows' in e.props ? e.props.maxRows : (e.props.scroll?.bodyRows ?? 40)
    const isBand = place === 'band'
    const sideBySide = isBand ? cols >= 70 : cols >= 110
    const rowsFree = Math.max(8, sideBySide ? roomRows - 1 : roomRows - (isBand ? 9 : 12))
    const panePx = Math.round(Math.min(sideBySide ? (cols - 34) * 8.4 : cols * 8.4 - 8, (rowsFree + 1) * 20))
    // In the band, rows are a hard limit: a row there is drawn about 16 to 20
    // pixels tall, so size by the smaller and keep two rows spare.
    const z = await read($, zoom)
    const bandPx = Math.round((Math.max(8, sideBySide ? roomRows - 1 : roomRows - 10)) * 19 * z)
    const byWidth = Math.floor((cols - 2) / 8)
    const cellH = Math.max(1, Math.min(Math.round(byWidth / 2.4), Math.floor(rowsFree / 8)))
    const cellW = Math.max(3, Math.min(byWidth, Math.round(cellH * 2.4)))
    const size = cellH >= 3 ? 'title' : cellH === 2 ? 'heading' : 'body'
    const side = toMove === 'w' ? 'White' : 'Black'
    const canDrag = e.surface === 'desktop' || e.surface === 'terminal'

    const { Box, Text, Button } = $.ui.resolve(e)

    const grid = (
      <Box flexDirection="column">
        {Array.from({ length: 8 }, (_, row) => (
          <Box flexDirection="row" key={`r${row}`}>
            <Box width={2} height={cellH} alignItems="center">
              <Text dimColor>{flip ? row + 1 : 8 - row}</Text>
            </Box>
            {Array.from({ length: 8 }, (_, c) => {
              const sq = squares[row * 8 + c] ?? ''
              const pc = board[sq]
              const bg = MARK[markOf(sq)] ?? ((row + c) % 2 === 0 ? '#ebe7d2' : '#6e9a76')
              return (
                <Box key={`b${sq}`} width={cellW} height={cellH} backgroundColor={bg} justifyContent="center" alignItems="center">
                  <Button key={sq} plain onPress={() => tap($, sq)}>
                    <Text size={size} bold color={pc !== undefined && isWhite(pc) ? '#ffffff' : '#111111'} backgroundColor={bg}>
                      {glyph(pc) || ' '}
                    </Text>
                  </Button>
                </Box>
              )
            })}
          </Box>
        ))}
        <Box flexDirection="row">
          <Box width={2} />
          {(flip ? [...FILES].reverse() : [...FILES]).map(f => (
            <Box key={`f${f}`} width={cellW} justifyContent="center">
              <Text dimColor>{f}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    )

    let boardTree = grid
    const own = squares.map(sq => { const pc = board[sq]; return pc !== undefined && isWhite(pc) === (toMove === 'w') })
    const layer: BoardProps = { own, locked: g.isSolved }
    // Where a piece may go: how it moves, plus the puzzle's own answer from that
    // square, so the answer is always on offer.
    const movesFrom = (sq: string) => {
      const answer = expected(p, g).filter(m => m.slice(0, 2) === sq).map(m => m.slice(2, 4))
      return [...new Set([...targets(board, sq, p.fen), ...answer])]
    }
    const chosen = g.isSolved ? [] : g.selected ? movesFrom(g.selected) : drag ? movesFrom(drag.from) : []
    let picker = null
    if (e.surface !== 'terminal') {
      const marks: Record<string, string> = {}
      for (const sq of squares) {
        const m = markOf(sq)
        if (m) marks[sq] = m
      }
      const source = boardSvg({ board, flip, marks, dots: chosen, dragFrom: drag?.from, dragOver: drag?.over })
      const alt = `Chess board, ${side} to move, mate in ${p.n}`
      if (e.surface === 'desktop') {
        // As large as the pane allows: a text column is about 8.4 pixels wide and
        // a row about 20 tall; leave rows for the text and buttons.
        const px = isBand
          ? Math.round(Math.max(160, Math.min(sideBySide ? (cols - 34) * 8.4 : cols * 8.4 - 8, bandPx, 1100)))
          : Math.round(Math.max(220, Math.min(panePx * z, 1600)))
        const { Svg, Client } = $.ui.resolve({ ...e, surface: 'desktop' })
        boardTree = (
          <Box alignSelf="flex-start">
            <Svg source={source} alt={alt} width={px} height={px} />
            <Box position="absolute" top={0} left={0} right={0} bottom={0}>
              <Client key="board" module="./board.tsx" props={layer} width="100%" height="100%" />
            </Box>
          </Box>
        )
      } else {
        const { Svg } = $.ui.resolve({ ...e, surface: e.surface })
        const vsPx = isBand
          ? Math.round(Math.max(160, Math.min(sideBySide ? (cols - 34) * 7.5 : cols * 7.5, bandPx, 1100)))
          : Math.round(Math.max(220, Math.min(panePx * z, 1600)))
        // A phone fits the picture to its width; VS Code sizes it to the pane.
        boardTree = e.surface === 'mobile'
          ? (isBand ? <Svg source={source} alt={alt} width={Math.max(160, Math.min(Math.round(cols * 7), bandPx))} height={Math.max(160, Math.min(Math.round(cols * 7), bandPx))} /> : <Svg source={source} alt={alt} />)
          : <Svg source={source} alt={alt} width={vsPx} height={vsPx} />
      }
      // Tap buttons: the way to move where a drag cannot reach the board, and a
      // second way everywhere else.
      if (!g.isSolved && !(isBand && e.surface === 'desktop')) {
        const sel = g.selected
        const pieces = squares.filter(sq => own[squares.indexOf(sq)] && movesFrom(sq).length > 0)
        picker = sel === null ? (
          <Box flexDirection="column">
            <Text dimColor>{e.surface === 'desktop' ? 'Or tap a piece:' : 'Tap a piece to move:'}</Text>
            <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
              {pieces.map(sq => (
                <Button key={`p-${sq}`} label={`${glyph(board[sq])} ${sq}`} onPress={() => tap($, sq)} />
              ))}
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text dimColor>Move {glyph(board[sel])} {sel} to:</Text>
            <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
              {movesFrom(sel).map(t => (
                <Button key={`t-${t}`} label={board[t] ? `×${t}` : t} onPress={() => { lastTap = { sq: '', at: 0 }; return move($, sel, t) }} />
              ))}
              <Button key="cancel" label="Cancel" onPress={() => update($, game, x => ({ ...x, selected: null }))} />
            </Box>
          </Box>
        )
      }
    } else {
      const { Client } = $.ui.resolve({ ...e, surface: 'terminal' })
      boardTree = (
        <Box>
          {grid}
          <Box position="absolute" top={0} left={2}>
            <Client key="board" module="./board.tsx" props={{ ...layer, cellW, cellH }} width={8 * cellW} height={8 * cellH} />
          </Box>
        </Box>
      )
    }

    const goBack = async () => {
      await update($, working, () => 'idle' as Working)
      if (place === 'pane') {
        await update($, paneOpen, () => false)
        await $.ui.close({ id: PANE })
      }
    }
    const banner =
      w === 'done' ? (
        <Box flexDirection="row" gap={1} flexWrap="wrap" alignItems="center">
          <Text color="#4cc27f" bold>✔ Claude's done.</Text>
          <Button key="back" label="Back to conversation" variant="primary" hotkey="b" onPress={goBack} />
          <Button key="stay" label="Finish puzzle" onPress={() => update($, working, () => 'playing' as Working)} />
        </Box>
      ) : w === 'working' ? (
        <Text color="#d9a440">⏳ Claude is working. Find the mate.</Text>
      ) : w === 'playing' ? (
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text color="#4cc27f">✔ Claude replied.</Text>
          <Button key="back" label="Back to conversation" hotkey="b" onPress={goBack} />
        </Box>
      ) : null

    const toneColor = g.tone === 'good' ? '#4cc27f' : g.tone === 'bad' ? '#e0705c' : undefined
    const prompt = g.message || (canDrag ? 'Drag a piece to its square, or click it and then the square.' : 'Tap a piece below, then where it goes.')

    const title = (
      <Text bold>
        Mate in {p.n} · {side} to move <Text dimColor>#{g.index + 1} of {PUZZLES.length}</Text>
      </Text>
    )
    const buttons = (
      <Box flexDirection="row" gap={1} flexWrap="wrap">
        {g.isSolved ? (
          <Button key="next" label="Next puzzle" variant="primary" hotkey="n" onPress={() => nextPuzzle($)} />
        ) : (
          <Box flexDirection="row" gap={1}>
            <Button key="hint" label="Hint" hotkey="h" onPress={async () => {
              await update($, stats, st => ({ ...st, streak: 0 }))
              await update($, game, x => ({ ...x, hinted: true, tone: 'plain' as const, message: 'The highlighted piece moves first.' }))
            }} />
            <Button key="show" label="Solution" onPress={() => showSolution($)} />
            <Button key="skip" label="Skip" onPress={() => nextPuzzle($)} />
          </Box>
        )}
      </Box>
    )
    const setZoom = async (f: (z: number) => number) => {
      const next = Math.round(Math.max(0.5, Math.min(1.8, f(await read($, zoom)))) * 100) / 100
      await update($, zoom, () => next)
      await $.store.set('zoom', next)
    }
    const score = (
      <Box flexDirection="column" gap={1}>
        <Text>
          {s.streak >= 2 ? <Text color="#f08c2e" bold>🔥 {s.streak} in a row  </Text> : null}
          <Text dimColor>Solved {s.solved} · best streak {s.best}</Text>
        </Text>
        {e.surface !== 'terminal' ? (
          <Box flexDirection="row" gap={1}>
            <Button key="zoom-out" label="− Smaller" onPress={() => setZoom(x => x - 0.1)} />
            <Button key="zoom-in" label="+ Bigger" onPress={() => setZoom(x => x + 0.1)} />
            {isBand ? <Button key="full" label="⛶ Full size" variant="primary" onPress={() => open($)} /> : null}
          </Box>
        ) : null}
      </Box>
    )

    if (sideBySide) {
      return (
        <Box flexDirection="row" gap={2}>
          {boardTree}
          <Box flexDirection="column" gap={1} flexShrink={1} minWidth={30}>
            {banner}
            {title}
            <Text color={toneColor}>{prompt}</Text>
            {picker}
            {buttons}
            {score}
          </Box>
        </Box>
      )
    }
    return (
      <Box flexDirection="column" gap={1}>
        {banner}
        {title}
        {boardTree}
        <Text color={toneColor}>{prompt}</Text>
        {picker}
        {buttons}
        {score}
      </Box>
    )
}
