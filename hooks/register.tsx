import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Game, Stats, Working } from '../types'
import type { BoardProps } from './board'
import { applyMove, FILES, glyph, isWhite, matches, parseFen, san } from './chess'
import type { Board, Puzzle } from './chess'
import { PUZZLES } from './puzzles'

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
})

const game = atom({ plugin: 'chess-break', key: 'game' } as const, fresh(0), { shape: 'game-2' })
const stats = atom({ plugin: 'chess-break', key: 'stats' } as const, { solved: 0, streak: 0, best: 0 }, { shape: 'stats-1' })
const working = atom({ plugin: 'chess-break', key: 'working' } as const, 'idle' as Working)

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

function open($: EngineInterface) {
  return $.ui.open({ id: PANE, title: TITLE, columns: 90 })
}

async function move($: EngineInterface, from: string, to: string) {
  let outcome = 'none' as 'none' | 'wrong' | 'solved'
  await update($, game, g => {
    if (g.isSolved) return g
    const { p, board } = position(g)
    const m = matches(expected(p, g), from, to)
    if (m === undefined) {
      outcome = 'wrong'
      return { ...g, selected: null, missed: true, tone: 'bad' as const, message: `${san(board, from + to)} doesn't force mate. Try again.` }
    }
    if (g.stage === 0 && p.n === 2 && p.r !== undefined) {
      const after = applyMove(board, m)
      return {
        ...g, stage: 1 as const, selected: null, line: [m, p.r], tone: 'good' as const,
        message: `${san(board, m)}! They reply ${san(after, p.r)}. Now finish it.`,
      }
    }
    outcome = 'solved'
    return {
      ...g, stage: 2 as const, selected: null, isSolved: true, line: [...g.line, m], tone: 'good' as const,
      message: `${san(board, m)}# Checkmate!`,
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
  const g = await read($, game)
  if (g.isSolved) return
  const { board, toMove } = position(g)
  const piece = board[sq]
  const isOwn = piece !== undefined && isWhite(piece) === (toMove === 'w')
  if (isOwn) {
    await update($, game, x => ({ ...x, selected: x.selected === sq ? null : sq }))
  } else if (g.selected !== null) {
    await move($, g.selected, sq)
  }
}

async function nextPuzzle($: EngineInterface) {
  const g = await read($, game)
  if (!g.isSolved) await update($, stats, s => ({ ...s, streak: 0 }))
  await update($, game, x => fresh(x.index + 1))
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
    const panes = await $.ui.panes()
    if (!panes.some(pane => pane.id === PANE)) void open($)
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const was = await read($, working)
    await update($, working, () => 'done' as Working)
    if (was === 'working') $.ui.toast('♟ Claude has replied: back to your session')
    return next(e)
  })

  on('ui.message', async ($, e) => {
    const d = e.data as { type?: unknown; idx?: unknown; from?: unknown; to?: unknown } | null
    const g = await read($, game)
    const flip = position(g).toMove === 'b'
    const ok = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 64
    if (d?.type === 'tap' && ok(d.idx)) await tap($, squareAt(d.idx, flip))
    if (d?.type === 'move' && ok(d.from) && ok(d.to)) await move($, squareAt(d.from, flip), squareAt(d.to, flip))
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const g = await read($, game)
    const s = await read($, stats)
    const w = await read($, working)
    const { p, board, toMove, last } = position(g)
    const flip = toMove === 'b'
    const hint = g.hinted && !g.isSolved ? expected(p, g)[0]?.slice(0, 2) : undefined
    const squares = Array.from({ length: 64 }, (_, i) => squareAt(i, flip))
    const marks = squares.map(sq => (sq === g.selected ? 'sel' : sq === hint ? 'hint' : last.includes(sq) ? 'last' : ''))
    // A text cell is about 2.4 times taller than wide, so a square is 2.4 columns per row.
    // Fill the pane's width, but leave room under the board for the text and buttons.
    const cols = e.props.bodyColumns ?? 40
    const rowsFree = Math.max(10, (e.props.scroll?.bodyRows ?? 40) - 10)
    const byWidth = Math.floor((cols - 2) / 8)
    const cellH = Math.max(1, Math.min(Math.round(byWidth / 2.4), Math.floor(rowsFree / 8)))
    const cellW = Math.max(3, Math.min(byWidth, Math.round(cellH * 2.4)))
    const side = toMove === 'w' ? 'White' : 'Black'

    const statusLine =
      w === 'working' ? ['#d9a440', '⏳ Claude is working. Find the mate.'] as const
      : w === 'done' ? ['#4cc27f', '✔ Claude replied. Back to your session!'] as const
      : [undefined, 'Solve a mate while Claude works.'] as const
    const hasClient = e.surface === 'desktop' || e.surface === 'terminal'

    const toneColor = g.tone === 'good' ? '#4cc27f' : g.tone === 'bad' ? '#e0705c' : undefined
    const prompt = g.message || (hasClient ? 'Drag a piece, or click it and then its square.' : 'Click a piece, then its square.')

    const r = $.ui.resolve(e)
    const { Box, Text, Button } = r
    let boardTree
    if (e.surface === 'desktop' || e.surface === 'terminal') {
      const { Client } = $.ui.resolve({ ...e, surface: e.surface })
      const props: BoardProps = {
        glyphs: squares.map(sq => glyph(board[sq])),
        white: squares.map(sq => { const pc = board[sq]; return pc !== undefined && isWhite(pc) }),
        own: squares.map(sq => { const pc = board[sq]; return pc !== undefined && isWhite(pc) === (toMove === 'w') }),
        marks,
        ranks: Array.from({ length: 8 }, (_, i) => String(flip ? i + 1 : 8 - i)),
        files: flip ? [...FILES].reverse() : [...FILES],
        cellW,
        cellH,
        selected: g.selected === null ? -1 : squares.indexOf(g.selected),
        locked: g.isSolved,
      }
      boardTree = <Client key="board" module="./board.tsx" props={props} width={2 + 8 * cellW} height={8 * cellH + 1} />
    } else {
      boardTree = (
        <Box flexDirection="column">
          {Array.from({ length: 8 }, (_, row) => (
            <Box flexDirection="row" key={`r${row}`}>
              {Array.from({ length: 8 }, (_, c) => {
                const i = row * 8 + c
                const sq = squares[i] ?? ''
                const pc = board[sq]
                const bg = ({ sel: '#e9cf4a', hint: '#5fb0ef', last: '#d6cf7a' } as Record<string, string>)[marks[i] ?? ''] ?? ((row + c) % 2 === 0 ? '#ebe7d2' : '#6e9a76')
                return (
                  <Button key={sq} plain onPress={() => tap($, sq)}>
                    <Text backgroundColor={bg} color={pc !== undefined && isWhite(pc) ? '#ffffff' : '#111111'} bold>
                      {` ${glyph(pc) || ' '} `}
                    </Text>
                  </Button>
                )
              })}
            </Box>
          ))}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Text color={statusLine[0]} bold={w === 'done'}>{statusLine[1]}</Text>
        <Text bold>
          Mate in {p.n} · {side} to move <Text dimColor>#{g.index + 1} of {PUZZLES.length}</Text>
        </Text>
        {boardTree}
        <Text color={toneColor}>{prompt}</Text>
        <Box flexDirection="row" gap={1}>
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
        <Text dimColor>Solved {s.solved} · streak {s.streak} · best {s.best}</Text>
      </Box>
    )
  })
}
