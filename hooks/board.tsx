import type { ClientModule } from 'claude-code'

// A see-through layer over the board that turns a drag into a move. The board
// itself is drawn by the pane, where pieces can use a large font; this layer
// draws nothing and only reports where the pointer went down and came up.
export type BoardProps = {
  cellW: number
  cellH: number
  own: boolean[]
  locked: boolean
}

type Local = { from: number; over: number } | null

const Board: ClientModule<BoardProps, Local> = (props, surface) => {
  const { Box } = surface.elements
  const { cellW, cellH } = props
  const drag = surface.state ?? null

  const at = (x: number, y: number) => {
    const col = Math.floor(x / cellW)
    const row = Math.floor(y / cellH)
    return col >= 0 && col < 8 && row >= 0 && row < 8 ? row * 8 + col : -1
  }

  surface.onPointer(e => {
    if (props.locked) return
    const idx = at(e.x, e.y)
    if (e.type === 'down' && e.button === 'left') {
      if (idx >= 0 && props.own[idx]) {
        surface.setState({ from: idx, over: idx })
        surface.post({ type: 'drag', from: idx, over: idx })
      } else if (idx >= 0) {
        surface.post({ type: 'tap', idx })
      }
    } else if (e.type === 'move' && drag && idx !== drag.over) {
      surface.setState({ from: drag.from, over: idx })
      surface.post({ type: 'drag', from: drag.from, over: idx })
    } else if (e.type === 'up' && drag) {
      surface.setState(null)
      if (idx >= 0 && idx !== drag.from) surface.post({ type: 'move', from: drag.from, to: idx })
      else surface.post({ type: 'tap', idx: drag.from })
    }
  })

  return <Box width={8 * cellW} height={8 * cellH} />
}

export default Board
