import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { fetchLeaderboard, fetchLifetimeLeaderboard } from '../api/leaderboard.api'
import LeaderboardTable from '../components/LeaderboardTable'
import { useAuthStore } from '../store/useAuthStore'
import { useSocketStore } from '../store/useSocketStore'
import { useUserStore } from '../store/useUserStore'

function OnlineCount() {
  const onlineCount = useSocketStore((s) => s.onlineCount)
  const connected = useSocketStore((s) => s.connected)

  if (!connected || onlineCount <= 0) return null

  return (
    <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 px-3 py-1 text-xs text-neon-cyan">
      <span className="inline-block w-2 h-2 rounded-full bg-neon-cyan animate-pulse mr-2" />
      {onlineCount} online
    </div>
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

function mapLeaderboardPayload(raw) {
  const list = Array.isArray(raw?.leaderboard) ? raw.leaderboard : []
  return list.map((u, i) => {
    const wins = Math.max(0, safeInt(u?.stats?.wins ?? u?.wins, 0))
    const losses = Math.max(0, safeInt(u?.stats?.losses ?? u?.losses, 0))
    const total = wins + losses
    const computedWinRate = total > 0 ? Math.round((wins / total) * 100) : 0
    const id = u?._id != null ? String(u._id) : u?.username != null ? String(u.username) : `row-${i}`
    const rankRaw = toFiniteNumber(u?.rank)
    const rank = rankRaw != null && rankRaw > 0 ? Math.trunc(rankRaw) : i + 1
    const winRate = clampInt(Math.round(toFiniteNumber(u?.winRate) ?? computedWinRate), 0, 100, 0)
    const xp = Math.max(0, safeInt(u?.xp ?? u?.stats?.xp ?? u?.score ?? u?.stats?.score, 0))
    return {
      id,
      rank,
      player: String(u?.name || u?.displayName || u?.username || 'Player'),
      winRate,
      xp,
    }
  })
}

function mergeRows(prevRows, nextRows) {
  const prev = Array.isArray(prevRows) ? prevRows : []
  const next = Array.isArray(nextRows) ? nextRows : []
  if (!next.length) return prev
  if (!prev.length) return next

  const prevById = new Map(prev.map((r) => [r.id || r.player, r]))
  return next.map((row) => {
    const key = row.id || row.player
    const existing = prevById.get(key)
    if (!existing) return row
    return { ...existing, ...row }
  })
}

export default function Leaderboard() {
  const user = useUserStore((s) => s.user)
  const authHydrated = useAuthStore((s) => s.hydrated)
  const token = useAuthStore((s) => s.token)
  const socketConnect = useSocketStore((s) => s.connect)
  const [scope, setScope] = useState('global')
  const [timeframe, setTimeframe] = useState('rolling') // rolling | lifetime
  const [rowsByKey, setRowsByKey] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const key = `${timeframe}:${scope}`
  const rows = useMemo(() => rowsByKey?.[key] || [], [key, rowsByKey])
  const currentName = user?.displayName || user?.username

  useEffect(() => {
    if (!authHydrated) return
    if (!token) return
    socketConnect(token)
  }, [authHydrated, socketConnect, token])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const raw =
          timeframe === 'lifetime'
            ? await fetchLifetimeLeaderboard(scope)
            : await fetchLeaderboard(scope)
        if (cancelled) return
        const mapped = mapLeaderboardPayload(raw)
        setRowsByKey((prev) => ({
          ...prev,
          [key]: mergeRows(prev?.[key], mapped),
        }))
        setError('')
      } catch (err) {
        if (cancelled) return
        const status = err?.response?.status
        const msg =
          status === 404
            ? err?.message ||
              'Leaderboard not found (404). Run the server in /server so GET /api/leaderboard is available.'
            : err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              'Failed to load leaderboard'
        setError(String(msg))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [key, scope, timeframe])

  useEffect(() => {
    const onSocketRefresh = async () => {
      try {
        const raw =
          timeframe === 'lifetime'
            ? await fetchLifetimeLeaderboard(scope)
            : await fetchLeaderboard(scope)
        const mapped = mapLeaderboardPayload(raw)
        setRowsByKey((prev) => ({
          ...prev,
          [key]: mergeRows(prev?.[key], mapped),
        }))
      } catch {
        // keep existing rows on background refresh failure
      }
    }
    window.addEventListener('xyxo:leaderboard:update', onSocketRefresh)
    return () => window.removeEventListener('xyxo:leaderboard:update', onSocketRefresh)
  }, [key, scope, timeframe])

  const displayRows = rows

  return (
    <Motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-display text-xl font-bold text-zinc-100">Leaderboard</div>
            <div className="mt-1 text-sm text-zinc-300">
              {timeframe === 'lifetime'
                ? 'All-time rankings based on lifetime XP.'
                : 'Rolling 7-day rankings powered by live stats.'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <OnlineCount />
            <div className="flex gap-2">
              <button
                type="button"
                className={[
                  'glass-button px-4 py-2 text-xs',
                  timeframe === 'rolling' ? 'nav-active' : '',
                ]
                  .join(' ')
                  .trim()}
                onClick={() => setTimeframe('rolling')}
              >
                7-day
              </button>
              <button
                type="button"
                className={[
                  'glass-button px-4 py-2 text-xs',
                  timeframe === 'lifetime' ? 'nav-active' : '',
                ]
                  .join(' ')
                  .trim()}
                onClick={() => setTimeframe('lifetime')}
              >
                All-time
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={['glass-button px-4 py-2 text-xs', scope === 'global' ? 'nav-active' : '']
                  .join(' ')
                  .trim()}
                onClick={() => setScope('global')}
              >
                Global
              </button>
              <button
                type="button"
                className={['glass-button px-4 py-2 text-xs', scope === 'regional' ? 'nav-active' : '']
                  .join(' ')
                  .trim()}
                onClick={() => setScope('regional')}
              >
                Regional
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {loading && !displayRows.length ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                Loading leaderboard...
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white/10" />
                      <div className="flex-1">
                        <div className="h-3 w-40 rounded bg-white/10" />
                        <div className="mt-2 h-3 w-24 rounded bg-white/10" />
                      </div>
                      <div className="h-3 w-16 rounded bg-white/10" />
                      <div className="h-3 w-16 rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-neon-purple/30 bg-neon-purple/10 p-4 text-sm text-zinc-100">
              {error}
            </div>
          ) : displayRows.length ? (
            <div className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-300">
                  Refreshing…
                </div>
              ) : null}
              <LeaderboardTable rows={displayRows} currentUsername={currentName} />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              No leaderboard data yet.
            </div>
          )}
        </div>
      </div>
    </Motion.div>
  )
}
