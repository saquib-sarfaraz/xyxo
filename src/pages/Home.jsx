import { motion as Motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGame } from '../api/game.api'
import Modal from '../components/Modal'
import { useAuthStore } from '../store/useAuthStore'
import { useUserStore } from '../store/useUserStore'

function OptionCard({ title, description, children }) {
  return (
    <div className="glass-panel p-5">
      <div className="font-display text-base font-bold text-zinc-100">{title}</div>
      <div className="mt-1 text-sm text-zinc-300">{description}</div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const continueAsGuest = useUserStore((s) => s.continueAsGuest)
  const token = useAuthStore((s) => s.token)

  const [guestName, setGuestName] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteRoomId, setInviteRoomId] = useState('')
  const [inviteMode, setInviteMode] = useState('online') // online | local (legacy)
  const [inviteError, setInviteError] = useState('')
  const [onlineLoading, setOnlineLoading] = useState(false)

  const me = useMemo(() => user, [user])
  const meName = me?.displayName || me?.username || 'Player'

  const ensureGuest = () => {
    if (useUserStore.getState().user) return
    continueAsGuest(guestName)
  }

  const requireToken = () => {
    if (token) return true
    window.alert('Login required for online play')
    navigate('/login')
    return false
  }

  const startLocal = () => {
    ensureGuest()
    navigate('/play/local')
  }

  const startAi = () => {
    ensureGuest()
    navigate('/play/ai')
  }

  const startFriendRoom = async () => {
    ensureGuest()
    if (!requireToken()) return

    setOnlineLoading(true)
    setInviteError('')
    try {
      const data = await createGame()
      const game = data?.game && typeof data.game === 'object' ? data.game : data
      const gameId = game?._id || game?.id || game?.gameId
      if (!gameId) throw new Error('Backend did not return a game id')
      navigate(`/play/online/${String(gameId)}`)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create online match'
      setInviteError(String(msg))
      setInviteRoomId('')
      setInviteMode('online')
      setInviteOpen(true)
    } finally {
      setOnlineLoading(false)
    }
  }

  const startOnline = async () => {
    ensureGuest()
    if (!requireToken()) return
    setOnlineLoading(true)
    setInviteError('')
    try {
      const data = await createGame()
      const game = data?.game && typeof data.game === 'object' ? data.game : data
      const gameId = game?._id || game?.id || game?.gameId
      if (!gameId) throw new Error('Backend did not return a game id')
      navigate(`/play/online/${String(gameId)}`)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create online match'
      setInviteError(String(msg))
      setInviteRoomId('')
      setInviteMode('online')
      setInviteOpen(true)
    } finally {
      setOnlineLoading(false)
    }
  }

  const startOnlineHelperText =
    'Online creates a NEW match. To join a friend, paste their game id below or open their invite link.'

  const joinRoom = () => {
    const rid = joinRoomId.trim()
    if (!rid) return
    ensureGuest()
    if (!token) {
      window.alert('Login required for online play')
      navigate('/login', { state: { next: `/play/online/${rid}` } })
      return
    }
    navigate(`/play/online/${rid}`)
  }

  const invitePath =
    inviteMode === 'online' ? `/play/online/${inviteRoomId}` : `/play/local/${inviteRoomId}`
  const inviteLink = inviteRoomId ? `${window.location.origin}${invitePath}` : ''

  return (
    <>
      <Motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <div className="glass-panel overflow-hidden p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Welcome
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-zinc-100">
                <span className="text-glow-cyan">TicTac</span>{' '}
                <span className="text-glow-purple">Pro</span> Multiplayer
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Tap.Play.Dominate.Jump into a match
                instantly—no login required.
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                {!me ? (
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter username to play"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-cyan/40 focus:ring-2 focus:ring-neon-cyan/25"
                  />
                ) : (
                  <div className="text-sm text-zinc-300">
                    Signed in as <span className="font-semibold text-zinc-100">{meName}</span>
                  </div>
                )}

                <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
                  <button
                    type="button"
                    className="glass-button nav-active px-5 py-3"
                    onClick={startLocal}
                  >
                    Local (2P)
                  </button>
                  <button type="button" className="glass-button px-5 py-3" onClick={startAi}>
                    Play vs AI
                  </button>
	                  <button
	                    type="button"
	                    className="glass-button px-5 py-3"
	                    onClick={startOnline}
	                    disabled={onlineLoading}
	                    title={startOnlineHelperText}
	                  >
	                    {onlineLoading ? 'Starting…' : 'Online'}
	                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-white/10 bg-neon-radial p-6 shadow-glass">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Quick Actions
              </div>
              <div className="mt-4 grid gap-3">
                <button type="button" className="glass-button w-full" onClick={startFriendRoom}>
                  Play with Friend
                </button>
	                <div className="flex gap-2">
                  <input
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Join online game id"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-purple/40 focus:ring-2 focus:ring-neon-purple/20"
                  />
	                  <button type="button" className="glass-button px-4 py-3" onClick={joinRoom}>
	                    Join
	                  </button>
	                </div>
	                <div className="text-xs text-zinc-400">{startOnlineHelperText}</div>
	              </div>
	            </div>
	          </div>
	        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <OptionCard
            title="Play vs AI"
            description="Practice with a clean, responsive board and power-ups."
          >
            <button type="button" className="glass-button w-full" onClick={startAi}>
              Start AI Match
            </button>
          </OptionCard>

          <OptionCard
            title="Play with Friend"
            description="Create a room and share an invite link instantly."
          >
            <button type="button" className="glass-button w-full" onClick={startFriendRoom}>
              Create Invite
            </button>
          </OptionCard>

          <OptionCard
            title="Go Pro"
            description="Login to access friends, save stats, and rematch faster."
          >
            <button
              type="button"
              className="glass-button w-full"
              onClick={() => navigate('/login')}
            >
              Login / Signup
            </button>
          </OptionCard>
        </div>
      </Motion.div>

      <Modal
        open={inviteOpen}
        title="Invite link"
        onClose={() => setInviteOpen(false)}
        actions={
          <>
            <button
              type="button"
              className="glass-button"
              onClick={async () => {
                if (!inviteLink) return
                await navigator.clipboard.writeText(inviteLink)
              }}
            >
              Copy link
            </button>
            <button
              type="button"
              className="glass-button nav-active"
              onClick={() => {
                setInviteOpen(false)
                navigate(invitePath)
              }}
              disabled={!inviteRoomId}
            >
              Start game
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {inviteError ? (
            <div className="rounded-2xl border border-neon-purple/30 bg-neon-purple/10 p-4 text-sm text-zinc-100">
              {inviteError}
            </div>
          ) : null}

          <div className="text-zinc-300">
            {inviteMode === 'online'
              ? 'Share this online invite link:'
              : 'Share this with a friend to join your room:'}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs text-zinc-100">
            {inviteLink || '—'}
          </div>
          <div className="text-xs text-zinc-400">
            {inviteMode === 'online'
              ? 'Requires backend running (REST + Socket.IO).'
              : 'Offline room for now (same device). Real multiplayer comes with the backend.'}
          </div>
        </div>
      </Modal>
    </>
  )
}
