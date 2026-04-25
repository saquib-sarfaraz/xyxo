function RankBadge({ rank }) {
  const badges = {
    1: { icon: '🥇', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.6)]', bg: 'bg-yellow-500/20' },
    2: { icon: '🥈', glow: 'shadow-[0_0_20px_rgba(192,192,192,0.5)]', bg: 'bg-zinc-400/20' },
    3: { icon: '🥉', glow: 'shadow-[0_0_20px_rgba(205,127,50,0.5)]', bg: 'bg-amber-700/20' },
  }
  const badge = badges[rank]
  if (!badge) return <span className="text-zinc-400">#{rank}</span>
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${badge.bg} ${badge.glow}`}
    >
      {badge.icon}
    </span>
  )
}

function toFiniteNumber(value) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function safeInt(value, fallback = 0) {
  const n = toFiniteNumber(value)
  if (n == null) return fallback
  return Math.trunc(n)
}

function clampInt(value, min, max, fallback = 0) {
  const n = safeInt(value, fallback)
  return Math.min(max, Math.max(min, n))
}

export default function LeaderboardTable({ rows, currentUsername }) {
  const safeRows = Array.isArray(rows) ? rows : []

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400">
          <tr>
            <th className="px-4 py-3 w-16">Rank</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Win rate</th>
            <th className="px-4 py-3">XP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {safeRows.map((row, i) => {
            const player = String(row?.player || 'Player')
            const isMe = currentUsername && player === currentUsername
            const rowKey = row?.id || player || `row-${i}`
            const rank = clampInt(row?.rank ?? i + 1, 1, 9999, i + 1)
            const winRate = clampInt(Math.round(toFiniteNumber(row?.winRate) ?? 0), 0, 100, 0)
            const xp = Math.max(0, safeInt(row?.xp, 0))
            return (
              <tr
                key={rowKey}
                className={[
                  'transition',
                  isMe ? 'bg-neon-cyan/10 shadow-neon-cyan' : 'hover:bg-white/5',
                ].join(' ')}
              >
                <td className="px-4 py-3">
                  <RankBadge rank={rank} />
                </td>
                <td className="px-4 py-3 text-zinc-100">{player}</td>
                <td className="px-4 py-3 text-zinc-200">{winRate}%</td>
                <td className="px-4 py-3 font-semibold text-neon-cyan">{xp}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
