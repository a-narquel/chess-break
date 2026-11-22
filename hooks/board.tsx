import type { ClientModule } from 'claude-code'

// A see-through layer laid over the board picture. It draws nothing; it turns
// the pointer into squares by where it falls across the layer's own width and
// height, so it needs no idea how many pixels a square takes.
export type BoardProps = {
  own: boolean[]
  locked: boolean
  // Given where the board is drawn in text cells (the terminal): the cells per square.
  cellW?: number
  cellH?: number
}

type Local = { from: number; over: number } | null

const Board: ClientModule<BoardProps, Local> = (props, surface) => {
  const { Box } = surface.elements
  const drag = surface.state ?? null

  const at = (e: { x: number; y: number; fine?: { x: number; y: number } }) => {
    const cols = props.cellW ? props.cellW * 8 : Math.max(1, surface.columns)
    const rows = props.cellH ? props.cellH * 8 : Math.max(1, surface.rows)
    const fx = e.fine?.x ?? e.x + 0.5
    const fy = e.fine?.y ?? e.y + 0.5
    const col = Math.floor((fx / cols) * 8)
    const row = Math.floor((fy / rows) * 8)
    return col >= 0 && col < 8 && row >= 0 && row < 8 ? row * 8 + col : -1
  }

  surface.onPointer(e => {
    if (props.locked) return
    const idx = at(e)
    if (e.type === 'down' && e.button === 'left') {
      if (idx >= 0 && props.own[idx]) {
        surface.setState({ from: idx, over: idx })
        surface.post({ type: 'drag', from: idx, over: idx })
      } else if (idx >= 0) {
        surface.post({ type: 'tap', idx })
      }
    } else if (e.type === 'move' && drag && idx !== drag.over && idx >= 0) {
      surface.setState({ from: drag.from, over: idx })
      surface.post({ type: 'drag', from: drag.from, over: idx })
    } else if (e.type === 'up' && drag) {
      surface.setState(null)
      if (idx >= 0 && idx !== drag.from) surface.post({ type: 'move', from: drag.from, to: idx })
      else surface.post({ type: 'tap', idx: drag.from })
    }
  })

  return <Box width="100%" height="100%" />
}

export default Board
