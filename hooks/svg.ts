import { FILES } from './chess'
import { pieceSvg } from './pieces'
import type { Board } from './chess'

const LIGHT = '#ebecd0'
const DARK = '#739552'
const MARK: Record<string, string> = {
  last: 'rgba(245, 246, 130, .8)',
  sel: 'rgba(245, 220, 80, .9)',
  hint: 'rgba(90, 170, 240, .75)',
  over: 'rgba(255, 255, 255, .55)',
  mate: 'rgba(224, 60, 50, .75)',
  bad: 'rgba(224, 80, 60, .55)',
}

export type SvgInput = {
  board: Board
  flip: boolean
  marks: Record<string, string>
  dots?: string[]
  dragFrom?: string
  dragOver?: string
  // The piece picked up by a click: drawn raised off its square, with a shadow.
  lift?: string
  // The move just played, uci: the piece glides from its old square to its new one.
  slide?: string
}

// The board as one SVG document, 800 units square, the side to move at the bottom.
export function boardSvg({ board, flip, marks, dots: targetDots = [], dragFrom, dragOver, lift, slide }: SvgInput): string {
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
  const piece = (p: string, x: number, y: number, opacity = 1) => pieceSvg(p, x, y, opacity)
  const slideTo = slide?.slice(2, 4)
  for (const [sq, p] of Object.entries(board)) {
    if (sq === lift || sq === slideTo) continue
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
  // The move just played glides in over a quarter of a second, then rests.
  if (slide && slideTo) {
    const p = board[slideTo]
    if (p) {
      const a = xy(slide.slice(0, 2))
      const b = xy(slideTo)
      out.push(
        `<g><animateTransform attributeName="transform" type="translate" from="${a.x - b.x} ${a.y - b.y}" to="0 0" ` +
          `dur="0.28s" calcMode="spline" keySplines="0.2 0.8 0.3 1" keyTimes="0;1" fill="freeze"/>${piece(p, b.x, b.y)}</g>`,
      )
    }
  }
  // A piece picked up by a click floats above its square and bobs a little.
  if (lift) {
    const p = board[lift]
    if (p) {
      const { x, y } = xy(lift)
      out.push(
        `<ellipse cx="${x + 50}" cy="${y + 90}" rx="30" ry="8" fill="rgba(0,0,0,.4)"/>` +
          `<g transform="translate(${x + 50} ${y + 50}) scale(1.12) translate(${-x - 50} ${-y - 58})">` +
          `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="1.4s" repeatCount="indefinite"/>` +
          `${piece(p, x, y)}</g></g>`,
      )
    }
  }
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
