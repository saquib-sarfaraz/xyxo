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

export default function LeaderboardTable({ rows, currentUsername }) {
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
          {rows.map((row) => {
            const isMe = currentUsername && row.player === currentUsername
            const rowKey = row.id || row.player
            return (
              <tr
                key={rowKey}
                className={[
                  'transition',
                  isMe ? 'bg-neon-cyan/10 shadow-neon-cyan' : 'hover:bg-white/5',
                ].join(' ')}
              >
                <td className="px-4 py-3">
                  <RankBadge rank={row.rank} />
                </td>
                <td className="px-4 py-3 text-zinc-100">{row.player}</td>
                <td className="px-4 py-3 text-zinc-200">{row.winRate}%</td>
                <td className="px-4 py-3 font-semibold text-neon-cyan">{row.xp}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

