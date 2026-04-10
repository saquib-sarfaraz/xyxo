import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from './Modal'
import { useAuthStore } from '../store/useAuthStore'
import { useUserStore } from '../store/useUserStore'

const AVATAR_PRESETS = [
  { id: 'cyber1', label: 'Cyber', hue: 190 },
  { id: 'neon2', label: 'Neon', hue: 285 },
  { id: 'ghost3', label: 'Ghost', hue: 140 },
  { id: 'ember4', label: 'Ember', hue: 35 },
  { id: 'ultra5', label: 'Ultra', hue: 320 },
]

function AvatarSwatch({ avatarId, active, onClick, label }) {
  return (
    <button
      type="button"
      className={[
        'group relative grid size-11 place-items-center rounded-2xl border shadow-glass transition',
        active ? 'border-neon-cyan/50 shadow-neon-cyan' : 'border-white/10 hover:border-white/20',
      ].join(' ')}
      onClick={onClick}
      aria-label={label}
    >
      <img
        src={`/avatars/${avatarId}.svg`}
        alt=""
        className="h-full w-full object-cover"
        draggable="false"
      />
      {active ? (
        <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-lg bg-black/50 text-xs font-black text-white">
          ✓
        </span>
      ) : null}
    </button>
  )
}

export default function SettingsModal({ open, onClose }) {
  const user = useUserStore((s) => s.user)
  const logout = useUserStore((s) => s.logout)
  const updateProfile = useUserStore((s) => s.updateProfile)
  const updatePassword = useUserStore((s) => s.updatePassword)
  const authLogout = useAuthStore((s) => s.logout)

  const provider = user?.authProvider ?? (user?.isGuest ? 'guest' : 'local')

  const [username, setUsername] = useState(user?.username ?? '')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? 'cyber1')
  const [hue, setHue] = useState(user?.avatarHue ?? 190)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  const avatarLabel = useMemo(() => {
    return AVATAR_PRESETS.find((p) => p.id === avatarId)?.label ?? 'Custom'
  }, [avatarId])

  if (!open) return null

  return (
    <Modal
      open={open}
      title="Settings"
      onClose={onClose}
      actions={
        <>
          {user ? (
            <button
              type="button"
              className="glass-button"
              onClick={() => {
                logout()
                authLogout()
                onClose?.()
              }}
            >
              Logout
            </button>
          ) : null}
          <button
            type="button"
            className="glass-button nav-active"
            onClick={() => {
              if (!user) return

              const res = updateProfile({ username, displayName, avatarId, avatarHue: hue })
              if (!res?.ok) {
                setMessage(res?.error || 'Could not save.')
                return
              }

              if (provider === 'local' && newPassword) {
                const r = updatePassword({ currentPassword, newPassword })
                if (!r?.ok) {
                  setMessage(r?.error || 'Could not update password.')
                  return
                }
              }

              setMessage('Saved.')
              setCurrentPassword('')
              setNewPassword('')
            }}
          >
            Save
          </button>
        </>
      }
    >
      {!user ? (
        <div className="space-y-3">
          <div className="text-sm text-zinc-300">Login to edit your profile.</div>
          <Link to="/login" className="glass-button nav-active">
            Go to Login
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Username
              </div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-cyan/40 focus:ring-2 focus:ring-neon-cyan/25"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Display name
              </div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-purple/40 focus:ring-2 focus:ring-neon-purple/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Avatar
              </div>
              <div className="text-[11px] text-zinc-500">
                {avatarLabel}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((p) => (
                <AvatarSwatch
                  key={p.id}
                  avatarId={p.id}
                  active={p.id === avatarId}
                  label={p.label}
                  onClick={() => {
                    setAvatarId(p.id)
                    setHue(p.hue)
                  }}
                />
              ))}
            </div>

            <input
              type="range"
              min="0"
              max="359"
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              className="w-full accent-neon-cyan"
            />
          </div>

          {provider === 'local' ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Password
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  type="password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-cyan/40 focus:ring-2 focus:ring-neon-cyan/25"
                />
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  type="password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-purple/40 focus:ring-2 focus:ring-neon-purple/20"
                />
              </div>
              <div className="text-[11px] text-zinc-500">
                Leave blank to keep your current password.
              </div>
            </div>
          ) : provider === 'backend' ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              Password is managed by the server. Use the backend account recovery flow to reset it.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              Guests don’t have a password. Create an account in Login / Signup to save
              across devices.
            </div>
          )}

          {message ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
              {message}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
