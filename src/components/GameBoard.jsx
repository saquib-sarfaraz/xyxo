import { motion as Motion } from 'framer-motion'

const FALLBACK_BOARD = Array.from({ length: 9 }, () => null)

function Mark({ value }) {
  if (!value) return null

  const isX = value === 'X'
  return (
    <span
      className={[
        'text-5xl font-black tracking-tight',
        isX ? 'text-neon-cyan text-glow-cyan' : 'text-neon-purple text-glow-purple',
      ].join(' ')}
    >
      {value}
    </span>
  )
}

export default function GameBoard({
  board,
  onMove,
  disabled,
  winningLine,
  removeMode,
  removeTarget,
}) {
  const safeBoard = Array.isArray(board) && board.length === 9 ? board : FALLBACK_BOARD

  return (
    <div className="w-full max-w-md">
      <div className="grid grid-cols-3 gap-3">
        {safeBoard.map((value, index) => {
          const isWinningTile = winningLine?.includes(index)
          const removable = removeMode && value && value === removeTarget
          return (
            <Motion.button
              key={index}
              type="button"
              className={[
                'tile relative flex aspect-square w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-4xl font-bold text-zinc-100 shadow-glass transition hover:border-white/20 hover:bg-white/10 hover:shadow-neon-purple',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                isWinningTile ? 'border-neon-cyan/50 shadow-neon-cyan' : '',
                removeMode ? 'ring-2 ring-neon-purple/40' : '',
              ].join(' ')}
              onClick={() => onMove(index)}
              disabled={disabled}
              whileHover={disabled ? undefined : { scale: 1.02 }}
              whileTap={disabled ? undefined : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              <Mark value={value} />
              {removable ? (
                <span className="absolute right-2 top-2 rounded-lg bg-neon-purple/15 px-2 py-0.5 text-[10px] font-semibold text-neon-purple">
                  remove
                </span>
              ) : null}
            </Motion.button>
          )
        })}
      </div>
    </div>
  )
}
