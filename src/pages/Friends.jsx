import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGame } from '../api/game.api'
import { searchUsers as searchUsersApi, fetchFriends, sendFriendRequest as sendFriendRequestApi } from '../api/user.api'
import FriendCard from '../components/FriendCard'
import Modal from '../components/Modal'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import { useSocketStore } from '../store/useSocketStore'

export default function Friends() {
  const navigate = useNavigate()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [search, setSearch] = useState('')

  const friends = useAppStore((s) => s.friends)
  const searchResults = useAppStore((s) => s.userSearchResults)
  const pendingFriendRequestIds = useAppStore((s) => s.pendingFriendRequestIds)
  const setUserSearchResults = useAppStore((s) => s.setUserSearchResults)
  const authHydrated = useAuthStore((s) => s.hydrated)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const socketConnect = useSocketStore((s) => s.connect)
  const socketSearchUsers = useSocketStore((s) => s.searchUsers)
  const socketRequestFriend = useSocketStore((s) => s.requestFriend)
  const socketInviteToGame = useSocketStore((s) => s.inviteToGame)
  const socketConnected = useSocketStore((s) => s.connected)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) => String(f.username).toLowerCase().includes(q))
  }, [friends, search])

  const inviteUser = async (toUserId) => {
    if (!token) {
      window.alert('Login required for online play')
      navigate('/login')
      return
    }

    setInviteError('')
    try {
      const data = await createGame()
      const game = data?.game && typeof data.game === 'object' ? data.game : data
      const gameId = game?._id || game?.id || game?.gameId
      if (!gameId) throw new Error('Backend did not return a game id')
      if (toUserId) {
        socketInviteToGame({ toUserId: String(toUserId), gameId: String(gameId) })
        // Quick match flow: inviter enters room immediately.
        navigate(`/play/online/${String(gameId)}`)
        return
      }
      const link = `${window.location.origin}/play/online/${String(gameId)}`
      setInviteLink(link)
      setInviteOpen(true)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create online match'
      setInviteError(String(msg))
      setInviteLink('')
      setInviteOpen(true)
    }
  }

  const myId = user?._id || user?.id || null
  const myUsername = String(user?.username || '').toLowerCase()

  const normalizedResults = useMemo(() => {
    const friendsByUsername = new Set(
      friends.map((f) => String(f.username || '').trim().toLowerCase()).filter(Boolean),
    )
    return (Array.isArray(searchResults) ? searchResults : [])
      .map((r) => {
        const id = r?._id || r?.id || null
        const username = String(r?.username || '').trim()
        const displayName = String(r?.name || r?.displayName || username || 'User').trim()
        const isMe =
          (myId && id && String(id) === String(myId)) ||
          (username && username.toLowerCase() === myUsername)
        return {
          id: id ? String(id) : '',
          username,
          displayName,
          avatarId: r?.avatarId,
          avatarHue: r?.avatarHue,
          // Prefer backend truth (`isFriend`) and fallback to local friend map.
          isFriend:
            typeof r?.isFriend === 'boolean'
              ? r.isFriend
              : username
                ? friendsByUsername.has(username.toLowerCase())
                : false,
          isPending: id ? pendingFriendRequestIds.includes(String(id)) : false,
          isMe,
        }
      })
      .filter((x) => !x.isMe)
  }, [friends, myId, myUsername, pendingFriendRequestIds, searchResults])

  useEffect(() => {
    if (!authHydrated) return
    if (!token) return
    socketConnect(token)
  }, [authHydrated, socketConnect, token])

  useEffect(() => {
    if (!user?._id) return
    let cancelled = false
    fetchFriends()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data?.friends) ? data.friends : []
        for (const f of list) {
          useAppStore.getState().upsertFriend({
            username: f.username,
            _id: f._id,
            name: f.name,
            avatar: f.avatar,
            status: 'online',
          })
        }
      })
      .catch(() => {
        // ignore errors; socket sync may provide friends
      })
    return () => {
      cancelled = true
    }
  }, [user?._id])

  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setUserSearchResults([])
      return
    }
    if (q === '\\') {
      setUserSearchResults([])
      return
    }
    const t = setTimeout(() => {
      if (socketConnected) socketSearchUsers(q)
      // REST fallback ensures DB search works even if socket event contract differs.
      searchUsersApi(q)
        .then((data) => {
          const users = Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data?.results)
              ? data.results
              : Array.isArray(data)
                ? data
                : []
          if (users.length) setUserSearchResults(users)
        })
        .catch(() => {
          // ignore fallback errors; socket path may still provide results
        })
    }, 300)
    return () => clearTimeout(t)
  }, [search, setUserSearchResults, socketConnected, socketSearchUsers])

  return (
    <>
      <Motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-xl font-bold text-zinc-100">Friends</div>
              <div className="mt-1 text-sm text-zinc-300">
                Invite friends to a room. Offline friends are disabled.
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends by username"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-cyan/40 focus:ring-2 focus:ring-neon-cyan/25"
            />

            {filtered.length ? (
              filtered.map((f) => (
                <FriendCard
                  key={f.username}
                  name={f.username}
                  status={f.status}
                  avatarId={f.avatarId}
                  avatarHue={f.avatarHue}
                  onInvite={async () => inviteUser(f._id || f.id || f.userId || null)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
                No friends match that search. Search all users below.
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Find Players
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Search by username or name.
              </div>
              <div className="mt-3 space-y-2">
                {!search.trim() ? (
                  <div className="text-xs text-zinc-500">Type to search users.</div>
                ) : normalizedResults.length ? (
                  normalizedResults.map((r) => (
                    <div
                      key={r.id || r.username}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">
                          {r.displayName}
                        </div>
                        <div className="truncate text-xs text-zinc-400">@{r.username}</div>
                      </div>
                      {r.isFriend ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1 text-xs text-zinc-100">
                            Friend
                          </span>
                          <button
                            type="button"
                            className="glass-button px-3 py-2 text-xs"
                            disabled={!r.id}
                            onClick={() => inviteUser(r.id)}
                          >
                            Invite
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="glass-button px-3 py-2 text-xs"
                            disabled={!r.id || r.isPending}
                            onClick={async () => {
                              if (!token) {
                                navigate('/login')
                                return
                              }
                              if (!r.id) return
                              if (socketConnected) {
                                socketRequestFriend(r.id)
                              } else {
                                try {
                                  await sendFriendRequestApi(r.id)
                                  useAppStore.getState().setPendingFriendRequest(r.id, true)
                                } catch {
                                  // ignore
                                }
                              }
                            }}
                          >
                            {r.isPending ? 'Requested' : 'Add Friend'}
                          </button>
                          <button
                            type="button"
                            className="glass-button px-3 py-2 text-xs"
                            disabled={!r.id}
                            onClick={() => inviteUser(r.id)}
                          >
                            Invite
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-500">No users found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Motion.div>

      <Modal
        open={inviteOpen}
        title="Invite link"
        onClose={() => setInviteOpen(false)}
        actions={
          <button
            type="button"
            className="glass-button nav-active"
            onClick={async () => {
              if (!inviteLink) return
              await navigator.clipboard.writeText(inviteLink)
              setInviteOpen(false)
            }}
            disabled={!inviteLink}
          >
            Copy link
          </button>
        }
      >
        <div className="space-y-3">
          {inviteError ? (
            <div className="rounded-2xl border border-neon-purple/30 bg-neon-purple/10 p-4 text-sm text-zinc-100">
              {inviteError}
            </div>
          ) : null}
          <div className="text-sm text-zinc-300">
            Share this link with your friend:
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs text-zinc-100">
            {inviteLink || '—'}
          </div>
        </div>
      </Modal>
    </>
  )
}
