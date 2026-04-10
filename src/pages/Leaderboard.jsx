import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { fetchLeaderboard } from '../api/leaderboard.api'
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

function mapLeaderboardPayload(raw) {
  const list = Array.isArray(raw?.leaderboard) ? raw.leaderboard : []
  return list.map((u, i) => {
    const wins = Number(u?.stats?.wins ?? u?.wins ?? 0)
    const losses = Number(u?.stats?.losses ?? u?.losses ?? 0)
    const total = wins + losses
    const computedWinRate = total > 0 ? Math.round((wins / total) * 100) : 0
    const id = u?._id != null ? String(u._id) : u?.username != null ? String(u.username) : `row-${i}`
    return {
      id,
      rank: Number(u?.rank ?? i + 1),
      player: String(u?.name || u?.displayName || u?.username || 'Player'),
      winRate: Number(u?.winRate ?? computedWinRate),
      xp: Number(u?.xp ?? u?.stats?.xp ?? 0),
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
  const [tab, setTab] = useState('global')
  const [rowsByScope, setRowsByScope] = useState({ global: [], regional: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const rows = useMemo(() => rowsByScope?.[tab] || [], [rowsByScope, tab])
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
        const raw = await fetchLeaderboard(tab)
        if (cancelled) return
        const mapped = mapLeaderboardPayload(raw)
        setRowsByScope((prev) => ({
          ...prev,
          [tab]: mergeRows(prev?.[tab], mapped),
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
  }, [tab])

  useEffect(() => {
    const onSocketRefresh = async () => {
      try {
        const raw = await fetchLeaderboard(tab)
        const mapped = mapLeaderboardPayload(raw)
        setRowsByScope((prev) => ({
          ...prev,
          [tab]: mergeRows(prev?.[tab], mapped),
        }))
      } catch {
        // keep existing rows on background refresh failure
      }
    }
    window.addEventListener('xyxo:leaderboard:update', onSocketRefresh)
    return () => window.removeEventListener('xyxo:leaderboard:update', onSocketRefresh)
  }, [tab])

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
              Rolling 7-day rankings powered by live stats.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <OnlineCount />
            <div className="flex gap-2">
              <button
                type="button"
                className={['glass-button px-4 py-2 text-xs', tab === 'global' ? 'nav-active' : '']
                  .join(' ')
                  .trim()}
                onClick={() => setTab('global')}
              >
                Global
              </button>
              <button
                type="button"
                className={['glass-button px-4 py-2 text-xs', tab === 'regional' ? 'nav-active' : '']
                  .join(' ')
                  .trim()}
                onClick={() => setTab('regional')}
              >
                Regional
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {loading && !displayRows.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              Loading leaderboard...
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
