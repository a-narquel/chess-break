export type Game = {
  index: number
  stage: 0 | 1 | 2
  selected: string | null
  message: string
  tone: 'plain' | 'good' | 'bad'
  isSolved: boolean
  hinted: boolean
  missed: boolean
  line: string[]
  startedAt: number
  wrongSq: string | null
}
export type Stats = { solved: number; streak: number; best: number }
export type Working = 'idle' | 'working' | 'done' | 'playing'
export type Drag = { from: string; over: string } | null

declare module 'claude-code' {
  interface PluginState {
    'chess-break': {
      game: Shaped<Game>
      stats: Shaped<Stats>
      working: Working
      drag: Drag
      zoom: number
    }
  }
}
