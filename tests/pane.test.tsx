import { expect, test } from 'claude-code/testing'

import { applyMove, FILES, parseFen, targets } from '../hooks/chess'
import { PUZZLES } from '../hooks/puzzles'

const PANE = {
  plugin: 'chess-break',
  component: 'Pane',
  requestId: 'chess-break',
  props: {
    title: 'Chess break', isFocused: false, bodyColumns: 60, placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 }, view: {},
  },
} as const

// Cell sizes the pane picks at 60 columns: (60-2)/8 = 7 wide, 3 tall. The drag layer starts at the board's edge.
const W = 7, H = 3, LEFT = 0

function cellOf(sq: string, flip: boolean) {
  const f = FILES.indexOf(sq[0]!)
  const r = Number(sq[1])
  const col = flip ? 7 - f : f
  const row = flip ? r - 1 : 8 - r
  return { x: LEFT + col * W + 3, y: row * H + 1 }
}

test('dragging the solution on the terminal board solves the puzzle', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  const p = PUZZLES[0]!
  const flip = parseFen(p.fen).turn === 'b'
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const drag = async (uci: string) => {
    const a = cellOf(uci.slice(0, 2), flip), b = cellOf(uci.slice(2, 4), flip)
    await ui.pointer({ type: 'down', x: a.x, y: a.y, button: 'left' })
    await ui.pointer({ type: 'move', x: b.x, y: b.y, button: 'left' })
    await ui.pointer({ type: 'up', x: b.x, y: b.y, button: 'left' })
  }
  await drag(p.a[0]!)
  if (p.n === 2) await drag(p.b![0]!)
  expect((await ui.find({ type: 'Text', text: /Checkmate/ }))?.text).toContain('Checkmate')
  expect((await ui.find({ type: 'Text', text: /Solved 1/ }))?.text).toContain('streak 1')
  await ui.unmount()
})

test('a wrong drag is refused and resets nothing else', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  const p = PUZZLES[0]!
  const flip = parseFen(p.fen).turn === 'b'
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const from = p.a[0]!.slice(0, 2)
  const to = from === 'd4' ? 'e5' : 'd4'
  const a = cellOf(from, flip), b = cellOf(to, flip)
  await ui.pointer({ type: 'down', x: a.x, y: a.y, button: 'left' })
  await ui.pointer({ type: 'up', x: b.x, y: b.y, button: 'left' })
  expect((await ui.find({ type: 'Text', text: /Try again/ }))?.text).toContain('Try again')
  await ui.unmount()
})

test('desktop and vscode: click a piece on the board, then its square', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  let t = 0
  on('clock.now', () => ({ value: (t += 1000) }))
  const p = PUZZLES[0]!
  for (const surface of ['desktop', 'vscode'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Svg' })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: 'e4' })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: `p-${p.a[0]!.slice(0, 2)}` })).toBeFalsy()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const play = async (uci: string) => {
    await ui.press({ key: uci.slice(0, 2) })
    await ui.press({ key: uci.slice(2, 4) })
  }
  await play(p.a[0]!)
  if (p.n === 2) await play(p.b![0]!)
  expect((await ui.find({ type: 'Text', text: /Checkmate/ }))?.text).toContain('Checkmate')
  await ui.unmount()
})

test('mobile: tap buttons under the board', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  let t = 0
  on('clock.now', () => ({ value: (t += 1000) }))
  const p = PUZZLES[0]!
  const ui = await $.ui.mount({ ...PANE, surface: 'mobile' })
  expect(await ui.find({ type: 'Svg' })).toBeTruthy()
  const play = async (uci: string) => {
    await ui.press({ key: `p-${uci.slice(0, 2)}` })
    await ui.press({ key: `t-${uci.slice(2, 4)}` })
  }
  await play(p.a[0]!)
  if (p.n === 2) await play(p.b![0]!)
  expect((await ui.find({ type: 'Text', text: /Checkmate/ }))?.text).toContain('Checkmate')
  await ui.unmount()
})

test('every puzzle offers its answer among the tap targets', async () => {
  for (const p of PUZZLES) {
    const b0 = parseFen(p.fen).board
    const first = p.a[0]!
    expect(targets(b0, first.slice(0, 2), p.fen)).toContain(first.slice(2, 4))
    if (p.n === 2) {
      const b2 = applyMove(applyMove(b0, first), p.r!)
      const last = p.b![0]!
      expect(targets(b2, last.slice(0, 2), p.fen)).toContain(last.slice(2, 4))
    }
  }
})

test('when Claude is done, the pane offers to go back or keep playing', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.notify', () => ({ value: { isSent: false, reason: 'no-surface' } }))
  on('ui.toast', () => ({ value: undefined }))
  let closed = ''
  on('ui.close', (_, e) => { closed = e.id; return { value: undefined } })
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Claude's done/ }))?.text).toContain("Claude's done")
  await ui.press({ key: 'back' })
  expect(closed).toBe('chess-break')
  await ui.unmount()
})

test('one click that reaches both the drag layer and the button counts once', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 5000 }))
  const p = PUZZLES[0]!
  const flip = parseFen(p.fen).turn === 'b'
  const from = p.a[0]!.slice(0, 2)
  const a = cellOf(from, flip)
  const ui2 = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui2.pointer({ type: 'down', x: a.x, y: a.y, button: 'left' })
  await ui2.pointer({ type: 'up', x: a.x, y: a.y, button: 'left' })
  await ui2.press({ key: from })
  expect((await ui2.find({ type: 'Text', text: /Click a piece/ }))).toBeTruthy()
  await ui2.press({ key: p.a[0]!.slice(2, 4) })
  expect((await ui2.find({ type: 'Text', text: /Checkmate|finish it/ }))).toBeTruthy()
  await ui2.unmount()
})

test('a prompt opens the board in the side pane', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('ui.panes', () => ({ value: [] }))
  let opened = ''
  on('ui.open', (_, e) => { opened = e.id; return { value: { isPlaced: true } } })
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  expect(opened).toBe('chess-break')
})

test('Bigger and Smaller resize the board and are remembered', async ($, on) => {
  const kept: Record<string, unknown> = {}
  on('store.set', (_, e) => { kept[e.key] = e.value; return { value: undefined } })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const width = async () => ((await ui.find({ type: 'Svg' })) as { props?: { width?: number } } | undefined)?.props?.width ?? 0
  const before = await width()
  await ui.press({ key: 'zoom-out' })
  expect(await width()).toBeLessThan(before)
  expect(kept.zoom).toBe(0.9)
  await ui.unmount()
})
