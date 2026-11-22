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

test('vscode and mobile show the drawn board and solve with tap buttons', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  let t = 0
  on('clock.now', () => ({ value: (t += 1000) }))
  const p = PUZZLES[0]!
  for (const surface of ['vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Svg' })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: `p-${p.a[0]!.slice(0, 2)}` })).toBeTruthy()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'mobile' })
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
  expect((await ui2.find({ type: 'Text', text: /Drag a piece/ }))).toBeTruthy()
  await ui2.press({ key: p.a[0]!.slice(2, 4) })
  expect((await ui2.find({ type: 'Text', text: /Checkmate|finish it/ }))).toBeTruthy()
  await ui2.unmount()
})

test('the desktop board is a picture, and a drag reported over it plays the move', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  const p = PUZZLES[0]!
  const flip = parseFen(p.fen).turn === 'b'
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Svg' })).toBeTruthy()
  const idx = (sq: string) => {
    const f = FILES.indexOf(sq[0]!), r = Number(sq[1])
    return (flip ? r - 1 : 8 - r) * 8 + (flip ? 7 - f : f)
  }
  const play = async (uci: string) => ui.post({ type: 'move', from: idx(uci.slice(0, 2)), to: idx(uci.slice(2, 4)) })
  await play(p.a[0]!)
  if (p.n === 2) await play(p.b![0]!)
  expect((await ui.find({ type: 'Text', text: /Checkmate/ }))?.text).toContain('Checkmate')
  await ui.unmount()
})

const BAND = {
  plugin: 'chess-break',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false, isCollapsed: false, isWorking: true, maxRows: 26, bodyColumns: 140,
    scroll: { offset: 0, bodyRows: 25 }, view: {},
  },
} as const

test('the board sits above the prompt from a prompt until you go back', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.notify', () => ({ value: { isSent: false, reason: 'no-surface' } }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })

  let ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Svg' })).toBeFalsy()
  await ui.unmount()

  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  for (const surface of ['desktop', 'vscode', 'mobile', 'terminal'] as const) {
    const each = await $.ui.mount({ ...BAND, surface })
    expect((await each.find({ type: 'Text', text: /Mate in/ }))).toBeTruthy()
    expect((await each.find({ type: 'Text', text: /Claude is working/ }))).toBeTruthy()
    await each.unmount()
  }

  await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Claude's done/ }))).toBeTruthy()
  await ui.press({ key: 'stay' })
  expect(await ui.find({ type: 'Svg' })).toBeTruthy()
  await ui.press({ key: 'back' })
  await ui.unmount()
  ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Svg' })).toBeFalsy()
  await ui.unmount()
})

test('Bigger and Smaller resize the board in the band and are remembered', async ($, on) => {
  const kept: Record<string, unknown> = {}
  on('store.set', (_, e) => { kept[e.key] = e.value; return { value: undefined } })
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('clock.now', () => ({ value: 1000 }))
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const width = async () => ((await ui.find({ type: 'Svg' })) as { props?: { width?: number } } | undefined)?.props?.width ?? 0
  const before = await width()
  await ui.press({ key: 'zoom-out' })
  const smaller = await width()
  expect(smaller).toBeLessThan(before)
  expect(kept.zoom).toBe(0.9)
  await ui.unmount()
})

test('Full size moves the board into the pane, and closing the pane brings it back', async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.notify', () => ({ value: { isSent: false, reason: 'no-surface' } }))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
  let band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await band.press({ key: 'full' })
  await band.unmount()
  band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Svg' })).toBeFalsy()
  await band.unmount()
  const pane = await $.ui.mount({ ...PANE, props: { ...PANE.props, bodyColumns: 200, scroll: { offset: 0, bodyRows: 50 } }, surface: 'desktop' })
  const svg = (await pane.find({ type: 'Svg' })) as { props?: { width?: number } } | undefined
  expect(svg?.props?.width ?? 0).toBeGreaterThan(800)
  await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
  await pane.press({ key: 'stay' })
  await pane.press({ key: 'back' })
  await pane.unmount()
  await $.prompt.submit({ text: 'again', wait: false, origin: { kind: 'composer' } })
  band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Svg' })).toBeTruthy()
  await band.unmount()
})
