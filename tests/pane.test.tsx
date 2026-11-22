import { expect, test } from 'claude-code/testing'

import { FILES, parseFen } from '../hooks/chess'
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

test('dragging the solution on the desktop board solves the puzzle', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  const p = PUZZLES[0]!
  const flip = parseFen(p.fen).turn === 'b'
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
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
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const from = p.a[0]!.slice(0, 2)
  const to = from === 'd4' ? 'e5' : 'd4'
  const a = cellOf(from, flip), b = cellOf(to, flip)
  await ui.pointer({ type: 'down', x: a.x, y: a.y, button: 'left' })
  await ui.pointer({ type: 'up', x: b.x, y: b.y, button: 'left' })
  expect((await ui.find({ type: 'Text', text: /Try again/ }))?.text).toContain('Try again')
  await ui.unmount()
})

test('vscode and mobile get a board of clickable squares', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  let t = 0
  on('clock.now', () => ({ value: (t += 1000) }))
  const p = PUZZLES[0]!
  for (const surface of ['vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Button', key: 'e4' })).toBeTruthy()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: p.a[0]!.slice(0, 2) })
  await ui.press({ key: p.a[0]!.slice(2, 4) })
  expect((await ui.find({ type: 'Text', text: /Checkmate|finish it/ }))).toBeTruthy()
  await ui.unmount()
})

test('when Claude is done, the pane offers to go back or keep playing', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.notify', () => ({ value: { isSent: false, reason: 'none' } }))
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
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const from = p.a[0]!.slice(0, 2)
  const a = cellOf(from, flip)
  await ui.pointer({ type: 'down', x: a.x, y: a.y, button: 'left' })
  await ui.pointer({ type: 'up', x: a.x, y: a.y, button: 'left' })
  await ui.press({ key: from })
  expect((await ui.find({ type: 'Text', text: /Now pick|Drag a piece/ }))).toBeTruthy()
  const to = p.a[0]!.slice(2, 4)
  await ui.press({ key: to })
  expect((await ui.find({ type: 'Text', text: /Checkmate|finish it/ }))).toBeTruthy()
  await ui.unmount()
})
