export type Puzzle = { fen: string; n: number; a: string[]; r?: string; b?: string[] }
export type Board = Record<string, string>

export const FILES = 'abcdefgh'
const file = (sq: string) => FILES.indexOf(sq[0] ?? '')

export function parseFen(fen: string): { board: Board; turn: 'w' | 'b' } {
  const [placement = '', turn] = fen.split(' ')
  const board: Board = {}
  placement.split('/').forEach((row, i) => {
    let f = 0
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch)
      else {
        board[`${FILES[f]}${8 - i}`] = ch
        f += 1
      }
    }
  })
  return { board, turn: turn === 'b' ? 'b' : 'w' }
}

export const isWhite = (piece: string) => piece === piece.toUpperCase()

export function applyMove(board: Board, uci: string): Board {
  const next = { ...board }
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const promo = uci[4]
  const piece = next[from]
  if (piece === undefined) return next
  const lower = piece.toLowerCase()
  const df = file(to) - file(from)
  if (lower === 'k' && Math.abs(df) === 2) {
    const rank = from[1]
    const [rf, rt] = df > 0 ? [`h${rank}`, `f${rank}`] : [`a${rank}`, `d${rank}`]
    const rook = next[rf]
    if (rook !== undefined) next[rt] = rook
    delete next[rf]
  }
  if (lower === 'p' && df !== 0 && next[to] === undefined) delete next[`${to[0]}${from[1]}`]
  delete next[from]
  next[to] = promo === undefined ? piece : isWhite(piece) ? promo.toUpperCase() : promo
  return next
}

const NAME: Record<string, string> = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: '' }

export function san(board: Board, uci: string): string {
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const piece = board[from]
  if (piece === undefined) return uci
  const lower = piece.toLowerCase()
  if (lower === 'k' && Math.abs(file(to) - file(from)) === 2) return to[0] === 'g' ? 'O-O' : 'O-O-O'
  const cap = board[to] !== undefined || (lower === 'p' && from[0] !== to[0])
  const head = lower === 'p' ? (cap ? (from[0] ?? '') : '') : (NAME[lower] ?? '')
  return `${head}${cap ? 'x' : ''}${to}${uci[4] ? `=${uci[4].toUpperCase()}` : ''}`
}

export function matches(accepted: string[], from: string, to: string): string | undefined {
  const same = accepted.filter(m => m.slice(0, 4) === from + to)
  return same.find(m => m.length === 4 || m[4] === 'q') ?? same[0]
}

// Filled glyphs for both sides; the colour tells them apart on the squares.
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
export const glyph = (piece: string | undefined) =>
  piece === undefined ? '' : `${GLYPH[piece.toLowerCase()] ?? '?'}︎`

// Squares a piece could move to, by how it moves, without checking for check:
// enough to offer as choices; the puzzle's answer decides what is right.
export function targets(board: Board, from: string, fen: string): string[] {
  const piece = board[from]
  if (piece === undefined) return []
  const white = isWhite(piece)
  const f0 = file(from)
  const r0 = Number(from[1])
  const out: string[] = []
  const at = (f: number, r: number) => (f >= 0 && f < 8 && r >= 1 && r <= 8 ? `${FILES[f]}${r}` : null)
  const isEnemy = (sq: string) => { const p = board[sq]; return p !== undefined && isWhite(p) !== white }
  const isEmpty = (sq: string) => board[sq] === undefined
  const ride = (dirs: number[][], far: boolean) => {
    for (const [df = 0, dr = 0] of dirs) {
      for (let k = 1; k < 8; k++) {
        const sq = at(f0 + df * k, r0 + dr * k)
        if (sq === null) break
        if (isEmpty(sq)) out.push(sq)
        else { if (isEnemy(sq)) out.push(sq); break }
        if (!far) break
      }
    }
  }
  const straight = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  const diagonal = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
  switch (piece.toLowerCase()) {
    case 'r': ride(straight, true); break
    case 'b': ride(diagonal, true); break
    case 'q': ride([...straight, ...diagonal], true); break
    case 'k': ride([...straight, ...diagonal], false); {
      const rights = fen.split(' ')[2] ?? ''
      const home = white ? 1 : 8
      if (from === `e${home}`) {
        if (rights.includes(white ? 'K' : 'k') && isEmpty(`f${home}`) && isEmpty(`g${home}`)) out.push(`g${home}`)
        if (rights.includes(white ? 'Q' : 'q') && isEmpty(`d${home}`) && isEmpty(`c${home}`) && isEmpty(`b${home}`)) out.push(`c${home}`)
      }
      break
    }
    case 'n':
      for (const [df, dr] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) {
        const sq = at(f0 + (df ?? 0), r0 + (dr ?? 0))
        if (sq !== null && (isEmpty(sq) || isEnemy(sq))) out.push(sq)
      }
      break
    case 'p': {
      const dir = white ? 1 : -1
      const one = at(f0, r0 + dir)
      if (one !== null && isEmpty(one)) {
        out.push(one)
        const two = at(f0, r0 + 2 * dir)
        if ((white ? r0 === 2 : r0 === 7) && two !== null && isEmpty(two)) out.push(two)
      }
      const ep = fen.split(' ')[3]
      for (const df of [-1, 1]) {
        const sq = at(f0 + df, r0 + dir)
        if (sq !== null && (isEnemy(sq) || sq === ep)) out.push(sq)
      }
      break
    }
  }
  return out
}
