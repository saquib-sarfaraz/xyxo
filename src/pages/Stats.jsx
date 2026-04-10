import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchUserStats } from '../api/user.api'
import { useAppStore } from '../store/useAppStore'
import { useUserStore } from '../store/useUserStore'

function Metric({ label, value, highlight }) {
  return (
    <div className="glass-panel p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${highlight || 'text-zinc-100'}`}>
        {value}
      </div>
    </div>
  )
}

export default function Stats() {
  const user = useUserStore((s) => s.user)
  const localStats = user?.stats ?? { matches: 0, wins: 0, losses: 0, xp: 0 }
  const matches = useAppStore((s) => s.matches)
  const clearMatches = useAppStore((s) => s.clearMatches)
  const [serverStats, setServerStats] = useState(null)
  const mountedRef = useRef(true)

  const stats = serverStats?.stats || localStats

  useEffect(() => {
    if (!user?._id) return
    mountedRef.current = true
    fetchUserStats(user._id)
      .then((data) => {
        if (mountedRef.current) setServerStats(data)
      })
      .catch(() => {
        // fallback to local stats
      })
    return () => {
      mountedRef.current = false
    }
  }, [user?._id])

  const totalGames = (stats.matches || stats.wins + stats.losses + stats.draws) ?? 0
  const winRate = useMemo(() => {
    if (!totalGames) return 0
    return Math.round((stats.wins / totalGames) * 100)
  }, [totalGames, stats.wins])

  const history = useMemo(() => {
    const username = user?.username
    const filtered = username
      ? matches.filter((m) => !m.username || m.username === username)
      : matches
    return filtered
      .slice()
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }, [matches, user?.username])

  const streak = useMemo(() => {
    if (serverStats?.stats?.currentStreak) return serverStats.stats.currentStreak
    let s = 0
    for (const m of history) {
      if (m.outcome !== 'win') break
      s += 1
    }
    return s
  }, [history, serverStats])

  const bestStreak = serverStats?.stats?.bestStreak || 0
  const draws = stats.draws || 0

  const chart = useMemo(() => {
    const recent = serverStats?.recentMatches?.slice(0, 10).reverse() || history.slice(0, 10).reverse()
    const samples = recent.map((m, i) => ({
      label: `#${i + 1}`,
      v: m.result === 'win' ? 10 : m.result === 'loss' ? 5 : 7,
    }))
    while (samples.length < 10) {
      samples.unshift({ label: '-', v: 2 })
    }
    const max = Math.max(...samples.map((s) => s.v), 1)
    return { samples, max }
  }, [serverStats, history])

  return (
    <Motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-display text-xl font-bold text-zinc-100">Stats</div>
            <div className="mt-1 text-sm text-zinc-300">
              Personal performance snapshot (MVP localStorage).
            </div>
          </div>

          {!user ? (
            <Link to="/login" className="glass-button px-4 py-2 text-xs">
              Login to save stats
            </Link>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Metric label="Matches" value={totalGames} />
          <Metric label="Wins" value={stats.wins} highlight="text-neon-cyan" />
          <Metric label="Losses" value={stats.losses} highlight="text-neon-purple" />
          <Metric label="Draws" value={draws} highlight="text-yellow-400" />
          <Metric label="Win rate" value={`${winRate}%`} />
          <Metric label="Streak" value={streak} highlight={streak > 0 ? 'text-orange-400' : 'text-zinc-100'} />
        </div>

        {bestStreak > 0 && (
          <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-2 text-xs text-orange-200">
            Best streak: <span className="font-semibold">{bestStreak}</span> wins
          </div>
        )}

        <div className="mt-6 glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-base font-bold text-zinc-100">
                Last 10 matches
              </div>
              <div className="mt-1 text-sm text-zinc-300">
                {serverStats ? 'Live from server' : 'Local history'}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200">
              XP: <span className="font-semibold">{stats.xp}</span>
            </div>
          </div>

          <div className="mt-5 flex items-end gap-2">
            {chart.samples.map((s) => (
              <div key={s.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-xl border border-white/10 bg-white/5 shadow-glass"
                  style={{ height: `${Math.round((s.v / chart.max) * 160) + 18}px` }}
                />
                <div className="text-[10px] text-zinc-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 glass-panel p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-display text-base font-bold text-zinc-100">
                Match history
              </div>
              <div className="mt-1 text-sm text-zinc-300">
                Stored locally for 7 days (frontend MVP).
              </div>
            </div>
            <button
              type="button"
              className="glass-button px-4 py-2 text-xs"
              onClick={() => clearMatches()}
              disabled={!history.length}
            >
              Clear history
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {history.length ? (
              history.slice(0, 12).map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glass sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        'rounded-lg border px-2 py-1 text-xs font-semibold',
                        m.outcome === 'win'
                          ? 'border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan'
                          : m.outcome === 'loss'
                            ? 'border-neon-purple/30 bg-neon-purple/10 text-neon-purple'
                            : 'border-white/10 bg-white/5 text-zinc-200',
                      ].join(' ')}
                    >
                      {String(m.outcome ?? 'draw').toUpperCase()}
                    </span>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-200">
                      {m.mode}
                    </span>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-300">
                      {m.roomId}
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-500">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
                No matches recorded yet. Play a local or AI match to populate history.
              </div>
            )}
          </div>
        </div>
      </div>
    </Motion.div>
  )
}
