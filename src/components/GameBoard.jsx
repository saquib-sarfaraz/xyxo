import { motion as Motion } from 'framer-motion'
import { memo, useCallback } from 'react'

const FALLBACK_BOARD = Array.from({ length: 9 }, () => null)

const tileVariants = {
  idle: { scale: 1 },
  press: { scale: 0.88 },
  placed: {
    scale: [0.6, 1.15, 1],
    opacity: [0, 1, 1],
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

function triggerHaptic() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8)
    }
  } catch {
    // ignore vibration errors
  }
}

function Mark({ value }) {
  if (!value) return null

  const isX = value === 'X'
  return (
    <Motion.span
      variants={tileVariants}
      initial="idle"
      animate="placed"
      className={[
        'text-5xl font-black tracking-tight',
        isX ? 'text-neon-cyan text-glow-cyan' : 'text-neon-purple text-glow-purple',
      ].join(' ')}
    >
      {value}
    </Motion.span>
  )
}

const Tile = memo(function Tile({ index, value, onMove, disabled, isWinningTile, removable, removeTarget }) {
  const handlePointerDown = useCallback(() => {
    if (disabled) return
    triggerHaptic()
    onMove(index)
  }, [disabled, index, onMove])

  return (
    <Motion.button
      type="button"
      className={[
        'tile relative flex aspect-square w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-4xl font-bold text-zinc-100 shadow-glass',
        'transition-all duration-75',
        'hover:border-white/20 hover:bg-white/10 hover:shadow-neon-purple',
        'active:scale-90 active:brightness-125',
        'touch-manipulation',
        'will-change-transform',
        'transform-gpu',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        isWinningTile ? 'border-neon-cyan/50 shadow-neon-cyan' : '',
        removable ? 'ring-2 ring-neon-purple/40' : '',
      ].join(' ')}
      onPointerDown={handlePointerDown}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
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
})

Tile.displayName = 'Tile'

function GameBoard({ board, onMove, disabled, winningLine, removeMode, removeTarget }) {
  const safeBoard = Array.isArray(board) && board.length === 9 ? board : FALLBACK_BOARD

  return (
    <div className="w-full max-w-md">
      <div className="grid grid-cols-3 gap-3">
        {safeBoard.map((value, index) => {
          const isWinningTile = winningLine?.includes(index)
          const removable = removeMode && value && value === removeTarget
          return (
            <Tile
              key={index}
              index={index}
              value={value}
              onMove={onMove}
              disabled={disabled}
              isWinningTile={isWinningTile}
              removable={removable}
              removeTarget={removeTarget}
            />
          )
        })}
      </div>
    </div>
  )
}

export default memo(GameBoard)