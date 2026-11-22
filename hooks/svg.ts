import { FILES, isWhite } from './chess'
import type { Board } from './chess'

const LIGHT = '#ebecd0'
const DARK = '#739552'
const MARK: Record<string, string> = {
  last: 'rgba(245, 246, 130, .8)',
  sel: 'rgba(245, 220, 80, .9)',
  hint: 'rgba(90, 170, 240, .75)',
  over: 'rgba(255, 255, 255, .55)',
}
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const FONT = "'DejaVu Sans', 'Segoe UI Symbol', 'Apple Symbols', 'Noto Sans Symbols 2', 'Arial Unicode MS', serif"

export type SvgInput = {
  board: Board
  flip: boolean
  marks: Record<string, string>
  dots?: string[]
  dragFrom?: string
  dragOver?: string
}

// The board as one SVG document, 800 units square, the side to move at the bottom.
export function boardSvg({ board, flip, marks, dots: targetDots = [], dragFrom, dragOver }: SvgInput): string {
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">`,
  ]
  const xy = (sq: string) => {
    const f = FILES.indexOf(sq[0] ?? 'a')
    const r = Number(sq[1])
    return { x: (flip ? 7 - f : f) * 100, y: (flip ? r - 1 : 8 - r) * 100 }
  }
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isLight = (r + c) % 2 === 0
      out.push(`<rect x="${c * 100}" y="${r * 100}" width="100" height="100" fill="${isLight ? LIGHT : DARK}"/>`)
    }
  }
  for (const [sq, mark] of Object.entries(marks)) {
    const fill = MARK[mark]
    if (!fill) continue
    const { x, y } = xy(sq)
    out.push(`<rect x="${x}" y="${y}" width="100" height="100" fill="${fill}"/>`)
  }
  const dots: string[] = []
  // Coordinates in the corners of the edge squares, as on a printed board.
  for (let i = 0; i < 8; i++) {
    const file = flip ? FILES[7 - i] : FILES[i]
    const rank = flip ? i + 1 : 8 - i
    const fileColor = (7 + i) % 2 === 0 ? DARK : LIGHT
    const rankColor = i % 2 === 0 ? DARK : LIGHT
    out.push(`<text x="${i * 100 + 93}" y="794" font-family="Arial, sans-serif" font-size="17" font-weight="700" text-anchor="end" fill="${fileColor}">${file}</text>`)
    out.push(`<text x="5" y="${i * 100 + 19}" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="${rankColor}">${rank}</text>`)
  }
  const piece = (p: string, x: number, y: number, opacity = 1) => {
    const white = isWhite(p)
    const g = GLYPH[p.toLowerCase()] ?? '?'
    return (
      `<text x="${x + 50}" y="${y + 52}" font-family="${FONT}" font-size="80" text-anchor="middle" dominant-baseline="central" ` +
      `fill="${white ? '#ffffff' : '#1d1d1d'}" stroke="${white ? '#1d1d1d' : '#000000'}" stroke-width="${white ? 3 : 1.5}" ` +
      `stroke-linejoin="round" paint-order="stroke" opacity="${opacity}">${g}&#xFE0E;</text>`
    )
  }
  for (const [sq, p] of Object.entries(board)) {
    const { x, y } = xy(sq)
    out.push(piece(p, x, y, sq === dragFrom && dragOver && dragOver !== dragFrom ? 0.3 : 1))
  }
  // Where the selected piece can go: a dot on an empty square, a ring round a capture.
  for (const sq of targetDots) {
    const { x, y } = xy(sq)
    dots.push(board[sq] === undefined
      ? `<circle cx="${x + 50}" cy="${y + 50}" r="15" fill="rgba(0,0,0,.18)"/>`
      : `<circle cx="${x + 50}" cy="${y + 50}" r="44" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="10"/>`)
  }
  out.push(...dots)
  if (dragFrom && dragOver && dragOver !== dragFrom) {
    const p = board[dragFrom]
    if (p) {
      const { x, y } = xy(dragOver)
      out.push(piece(p, x, y, 0.9))
    }
  }
  out.push('</svg>')
  return out.join('')
}
