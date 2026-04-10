import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { useSocketStore } from '../store/useSocketStore'

function formatTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ''
  }
}

function kindLabel(type) {
  if (type === 'friend_request') return 'Friend request'
  if (type === 'match_invite') return 'Match invite'
  if (type === 'rematch') return 'Rematch'
  return 'Notification'
}

function messageFor(n, resolvedName) {
  const rawUser = typeof n?.user === 'string' ? n.user.trim() : ''
  const genericUser =
    !rawUser ||
    ['user', 'unknown', 'unknown user'].includes(rawUser.toLowerCase())
      ? null
      : rawUser
  const idFallback = n?.fromUserId ? `User ${String(n.fromUserId).slice(0, 6)}` : null
  const person =
    resolvedName ||
    n?.userObject?.name ||
    n?.userObject?.username ||
    genericUser ||
    idFallback ||
    'Unknown user'
  if (n.type === 'friend_request') return `${person} sent you a friend request.`
  if (n.type === 'match_invite') return `${person} invited you to a match.`
  if (n.type === 'rematch') return `${person} wants a rematch.`
  return 'You have a new notification.'
}

function ActionButtons({ n, onClose }) {
  const navigate = useNavigate()
  const dismiss = useAppStore((s) => s.dismissNotification)
  const acceptFriendRequest = useSocketStore((s) => s.acceptFriendRequest)
  const acceptGameInvite = useSocketStore((s) => s.acceptGameInvite)
  const rejectGameInvite = useSocketStore((s) => s.rejectGameInvite)

  if (n.type === 'friend_request') {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="glass-button nav-active px-3 py-2 text-xs"
          onClick={() => {
            acceptFriendRequest({ fromUserId: n.fromUserId, requestId: n.requestId })
            dismiss(n.id)
          }}
        >
          Accept
        </button>
        <button
          type="button"
          className="glass-button px-3 py-2 text-xs"
          onClick={() => dismiss(n.id)}
        >
          Decline
        </button>
      </div>
    )
  }

  if (n.type === 'match_invite' || n.type === 'rematch') {
    const gameId = n.roomId
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="glass-button nav-active px-3 py-2 text-xs"
          onClick={() => {
            if (!gameId) return
            acceptGameInvite({ gameId })
            dismiss(n.id)
            onClose?.()
            navigate(`/play/online/${gameId}`)
          }}
          disabled={!gameId}
        >
          {n.type === 'match_invite' ? 'Quick Match' : 'Rematch'}
        </button>
        <button
          type="button"
          className="glass-button px-3 py-2 text-xs"
          onClick={() => {
            rejectGameInvite({ gameId, fromUserId: n.fromUserId })
            dismiss(n.id)
          }}
        >
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className="glass-button px-3 py-2 text-xs"
        onClick={() => useAppStore.getState().dismissNotification(n.id)}
      >
        Dismiss
      </button>
    </div>
  )
}

function NotificationCard({ n, onClose, resolvedName }) {
  const rawUser = typeof n?.user === 'string' ? n.user.trim() : ''
  const genericUser =
    !rawUser ||
    ['user', 'unknown', 'unknown user'].includes(rawUser.toLowerCase())
      ? null
      : rawUser
  const idFallback = n?.fromUserId ? `User ${String(n.fromUserId).slice(0, 6)}` : null
  const displayName =
    resolvedName ||
    n?.userObject?.name ||
    n?.userObject?.username ||
    genericUser ||
    idFallback ||
    'Unknown user'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glass">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {kindLabel(n.type)}
          </div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">{displayName}</div>
          {n?.userObject?.username ? (
            <div className="text-[11px] text-zinc-400">@{n.userObject.username}</div>
          ) : null}
        </div>
        <div className="text-[11px] text-zinc-500">{formatTime(n.createdAt)}</div>
      </div>

      <div className="mt-2 text-sm text-zinc-300">{messageFor(n, resolvedName)}</div>

      <ActionButtons n={n} onClose={onClose} />
    </div>
  )
}

export default function NotificationPanel({ open, onClose }) {
  const notifications = useAppStore((s) => s.notifications)
  const friends = useAppStore((s) => s.friends)
  const clearNotifications = useAppStore((s) => s.clearNotifications)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const sorted = useMemo(() => {
    return notifications.slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }, [notifications])

  const friendsById = useMemo(() => {
    const map = new Map()
    for (const f of Array.isArray(friends) ? friends : []) {
      const id = f?._id || f?.id || f?.userId || null
      if (!id) continue
      const name = f?.name || f?.displayName || f?.username || null
      if (name) map.set(String(id), String(name))
    }
    return map
  }, [friends])

  return (
    <AnimatePresence>
      {open ? (
        <Motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/55"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose?.()
            }}
          />

          <Motion.aside
            className="absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-app-bg/70 backdrop-blur-2xl"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            aria-label="Notifications panel"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <div className="font-display text-lg font-bold text-zinc-100">
                    Notifications
                  </div>
                  <div className="text-xs text-zinc-400">
                    Requests, invites, and rematches
                  </div>
                </div>
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
                  onClick={onClose}
                  aria-label="Close notifications"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-auto px-5 py-4">
                {sorted.length ? (
                  sorted.map((n) => (
                    <NotificationCard
                      key={n.id}
                      n={n}
                      onClose={onClose}
                      resolvedName={
                        n?.fromUserId ? friendsById.get(String(n.fromUserId)) || null : null
                      }
                    />
                  ))
                ) : (
                  <div className="glass-panel p-5 text-sm text-zinc-300">
                    No notifications right now.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
                <button
                  type="button"
                  className="glass-button px-4 py-2 text-xs"
                  onClick={() => clearNotifications()}
                  disabled={!sorted.length}
                >
                  Clear all
                </button>
                <div className="text-[11px] text-zinc-500">
                  {sorted.length ? `${sorted.length} total` : 'All caught up'}
                </div>
              </div>
            </div>
          </Motion.aside>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  )
}
