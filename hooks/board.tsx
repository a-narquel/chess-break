import type { ClientModule } from 'claude-code'

// What the hooks module hands the board: 64 squares in display order.
export type BoardProps = {
  glyphs: string[]
  white: boolean[]
  own: boolean[]
  marks: string[]
  ranks: string[]
  files: string[]
  cellW: number
  cellH: number
  selected: number
  locked: boolean
}

type Drag = { from: number; x: number; y: number }
type Local = { drag: Drag | null }

const LIGHT = '#ebe7d2'
const DARK = '#6e9a76'
const MARK: Record<string, string> = { sel: '#e9cf4a', last: '#d6cf7a', hint: '#5fb0ef', over: '#f4f1e6' }
const LEFT = 2

const Board: ClientModule<BoardProps, Local> = (props, surface) => {
  const { Box, Text } = surface.elements
  const { cellW, cellH } = props
  const size = cellH >= 3 ? 'title' : cellH === 2 ? 'heading' : 'body'
  const drag = surface.state?.drag ?? null

  const at = (x: number, y: number) => {
    const col = Math.floor((x - LEFT) / cellW)
    const row = Math.floor(y / cellH)
    return col >= 0 && col < 8 && row >= 0 && row < 8 ? row * 8 + col : -1
  }

  surface.onPointer(e => {
    if (props.locked) return
    const idx = at(e.x, e.y)
    if (e.type === 'down' && e.button === 'left') {
      if (idx >= 0 && props.own[idx]) {
        surface.setState({ drag: { from: idx, x: e.x, y: e.y } })
      } else if (idx >= 0) {
        surface.post({ type: 'tap', idx })
      }
    } else if (e.type === 'move' && drag) {
      surface.setState({ drag: { ...drag, x: e.x, y: e.y } })
    } else if (e.type === 'up' && drag) {
      surface.setState({ drag: null })
      if (idx >= 0 && idx !== drag.from) surface.post({ type: 'move', from: drag.from, to: idx })
      else surface.post({ type: 'tap', idx: drag.from })
    }
  })

  const over = drag ? at(drag.x, drag.y) : -1
  const rows = []
  for (let r = 0; r < 8; r++) {
    const squares = []
    for (let c = 0; c < 8; c++) {
      const i = r * 8 + c
      const isLight = (r + c) % 2 === 0
      const mark = drag && i === over && i !== drag.from ? 'over' : drag && i === drag.from ? 'sel' : props.marks[i] ?? ''
      const bg = MARK[mark] ?? (isLight ? LIGHT : DARK)
      const lifted = drag !== null && i === drag.from
      squares.push(
        <Box key={`s${i}`} width={cellW} height={cellH} backgroundColor={bg} justifyContent="center" alignItems="center">
          <Text color={props.white[i] ? '#ffffff' : '#111111'} bold dimColor={lifted} size={size}>
            {props.glyphs[i] || ' '}
          </Text>
        </Box>,
      )
    }
    rows.push(
      <Box key={`r${r}`} flexDirection="row">
        <Box width={LEFT} height={cellH} alignItems="center">
          <Text dimColor>{props.ranks[r]}</Text>
        </Box>
        {squares}
      </Box>,
    )
  }

  const floating =
    drag === null ? null : (
      <Box position="absolute" left={Math.max(0, drag.x - Math.floor(cellW / 2))} top={Math.max(0, drag.y - Math.floor(cellH / 2))}
        width={cellW} height={cellH} justifyContent="center" alignItems="center">
        <Text color={props.white[drag.from] ? '#ffffff' : '#111111'} bold size={size}>
          {props.glyphs[drag.from]}
        </Text>
      </Box>
    )

  return (
    <Box flexDirection="column">
      {rows}
      <Box flexDirection="row">
        <Box width={LEFT} />
        {props.files.map(f => (
          <Box key={`f${f}`} width={cellW} justifyContent="center">
            <Text dimColor>{f}</Text>
          </Box>
        ))}
      </Box>
      {floating}
    </Box>
  )
}

export default Board
