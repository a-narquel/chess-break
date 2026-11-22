// Flat vector pieces drawn in a 100 x 100 box: one outline style for both
// sides, the side told by the fill. Details (eye, slit) take the other colour.
type Paint = { fill: string; stroke: string; detail: string }

const BASE = `<rect x="26" y="76" width="48" height="11" rx="4"/>`
const STEM = `<path d="M35 77 C38 64 43 57 43 51 L57 51 C57 57 62 64 65 77 Z"/>`

const SHAPES: Record<string, (c: Paint) => string> = {
  p: () =>
    `<path d="M37 77 C39 66 44 58 45 50 L55 50 C56 58 61 66 63 77 Z"/>` +
    `<rect x="39" y="45" width="22" height="7" rx="3.5"/>` +
    `<circle cx="50" cy="33" r="13"/>` + BASE,
  r: () =>
    `<path d="M33 77 L36 44 L64 44 L67 77 Z"/>` +
    `<rect x="31" y="40" width="38" height="7" rx="2"/>` +
    `<path d="M28 22 H38 V30 H45 V22 H55 V30 H62 V22 H72 V42 H28 Z"/>` + BASE,
  n: c =>
    `<path d="M33 77 C33 63 38 55 46 47 C39 48 33 51 28 48 C24 44 27 36 34 31 C38 28 42 24 44 20 L44 12 L52 20 C66 21 74 34 72 50 C71 61 67 69 68 77 Z"/>` +
    `<circle cx="45" cy="30" r="3" fill="${c.detail}" stroke="none"/>` +
    `<path d="M54 26 C62 32 64 42 62 54" fill="none" stroke="${c.detail}" stroke-width="2.5" stroke-linecap="round"/>` + BASE,
  b: c =>
    STEM +
    `<rect x="37" y="47" width="26" height="7" rx="3.5"/>` +
    `<path d="M50 16 C64 27 67 39 58 49 L42 49 C33 39 36 27 50 16 Z"/>` +
    `<circle cx="50" cy="12" r="5"/>` +
    `<path d="M55 27 L46 38" fill="none" stroke="${c.detail}" stroke-width="3" stroke-linecap="round"/>` + BASE,
  q: () =>
    STEM +
    `<rect x="35" y="45" width="30" height="7" rx="3.5"/>` +
    `<path d="M31 46 L27 24 L35 36 L39 18 L45 33 L50 13 L55 33 L61 18 L65 36 L73 24 L69 46 Z"/>` +
    `<circle cx="27" cy="22" r="4.5"/><circle cx="39" cy="16" r="4.5"/><circle cx="50" cy="11" r="4.5"/>` +
    `<circle cx="61" cy="16" r="4.5"/><circle cx="73" cy="22" r="4.5"/>` + BASE,
  k: () =>
    STEM +
    `<rect x="35" y="45" width="30" height="7" rx="3.5"/>` +
    `<path d="M37 46 C29 38 32 26 44 28 C47 28 49 30 50 32 C51 30 53 28 56 28 C68 26 71 38 63 46 Z"/>` +
    `<rect x="47" y="8" width="6" height="22" rx="2"/><rect x="40" y="13" width="20" height="6" rx="2"/>` + BASE,
}

const WHITE: Paint = { fill: '#fafaf7', stroke: '#2a2a2a', detail: '#2a2a2a' }
const BLACK: Paint = { fill: '#2f2f2f', stroke: '#141414', detail: '#e9e9e4' }

// One piece placed with its top-left corner at (x, y) in 100-unit squares.
export function pieceSvg(piece: string, x: number, y: number, opacity = 1): string {
  const isWhite = piece === piece.toUpperCase()
  const paint = isWhite ? WHITE : BLACK
  const shape = SHAPES[piece.toLowerCase()]
  if (!shape) return ''
  return (
    `<g transform="translate(${x + 50} ${y + 51}) scale(1.16) translate(-50 -50)" opacity="${opacity}" fill="${paint.fill}" stroke="${paint.stroke}" ` +
    `stroke-width="3" stroke-linejoin="round">${shape(paint)}</g>`
  )
}
