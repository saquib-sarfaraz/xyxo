import { motion as Motion } from 'framer-motion'
import Avatar from './Avatar'

function TimerBar({ active, timeLeft, timeTotal }) {
  const hasTime =
    typeof timeLeft === 'number' &&
    Number.isFinite(timeLeft) &&
    typeof timeTotal === 'number' &&
    Number.isFinite(timeTotal) &&
    timeTotal > 0

  const ratio =
    hasTime && active
      ? Math.max(0, Math.min(1, timeLeft / timeTotal))
      : active
        ? 0.75
        : 0.4
  const width = `${Math.round(ratio * 100)}%`
  const danger = Boolean(hasTime && active && timeLeft <= 2)

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
      {active ? (
        <div
          className={[
            'absolute inset-y-0 left-0 blur-md opacity-70 animate-pulse',
            danger ? 'bg-red-500' : 'bg-neon-cyan',
          ].join(' ')}
          style={{ width }}
          aria-hidden="true"
        />
      ) : null}
      <div
        style={{ width }}
        className={[
          'h-full rounded-full transition-[width] duration-1000',
          active ? (danger ? 'danger-bar' : 'neon-bar') : 'bg-white/10',
        ].join(' ')}
      />
    </div>
  )
}

function PlayerCard({ player, mark, active, score, timeLeft, timeTotal, isMyMark }) {
  return (
    <Motion.div
      initial={active ? { x: mark === 'X' ? -30 : 30, opacity: 0.5 } : false}
      animate={active ? { x: 0, opacity: 1 } : false}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={[
        'flex items-center gap-3 rounded-2xl border bg-white/5 p-4 shadow-glass backdrop-blur-xl transition',
        active ? 'border-neon-cyan/40 shadow-neon-cyan' : 'border-white/10',
      ].join(' ')}
    >
      <Avatar
        name={player.name}
        hue={player.avatarHue}
        avatarId={player.avatarId}
        className="size-10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold text-zinc-100">
            {player.name}
            {isMyMark && <span className="ml-1 text-neon-cyan">(You)</span>}
          </div>
          <div className="text-xs font-bold text-zinc-300">
            {active && isMyMark ? 'Your turn!' : `${mark} • ${score}`}
            {active && typeof timeLeft === 'number' && Number.isFinite(timeLeft) ? ` • ${timeLeft}s` : ''}
          </div>
        </div>
        <div className="mt-2">
          <TimerBar active={active} timeLeft={timeLeft} timeTotal={timeTotal} />
        </div>
      </div>
    </Motion.div>
  )
}

export default function PlayerHUD({ players, turn, scores, timeLeft, timeTotal, myMark }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <PlayerCard
        player={players.X}
        mark="X"
        active={turn === 'X'}
        score={scores.X}
        timeLeft={turn === 'X' ? timeLeft : undefined}
        timeTotal={timeTotal}
        isMyMark={myMark === 'X'}
      />
      <PlayerCard
        player={players.O}
        mark="O"
        active={turn === 'O'}
        score={scores.O}
        timeLeft={turn === 'O' ? timeLeft : undefined}
        timeTotal={timeTotal}
        isMyMark={myMark === 'O'}
      />
    </div>
  )
}
