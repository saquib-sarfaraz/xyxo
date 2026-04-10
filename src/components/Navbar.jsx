import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import NotificationPanel from './NotificationPanel'
import SettingsModal from './SettingsModal'
import { useAppStore } from '../store/useAppStore'
import { useUserStore } from '../store/useUserStore'

function IconButton({ label, children, to, onClick }) {
  const className =
    'grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-100 shadow-glass transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg'

  if (to) {
    return (
      <Link to={to} className={className} aria-label={label}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" className={className} aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}

export default function Navbar() {
  const user = useUserStore((s) => s.user)
  const notificationCount = useAppStore((s) => s.notifications.length)
  const [openNotifications, setOpenNotifications] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)

  return (
    <>
      <header className="sticky top-4 z-30">
        <div className="flex items-center justify-between gap-3 glass-panel px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl border border-neon-cyan/30 bg-white/5 shadow-neon-cyan">
            <span className="text-sm font-bold text-glow-cyan">TT</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-tight text-zinc-100">
              <span className="text-glow-cyan">TicTac</span>{' '}
              <span className="text-glow-purple">Pro</span>
            </div>
            <div className="text-xs text-zinc-400">Multiplayer</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="relative">
            <IconButton
              label="Notifications"
              onClick={() => setOpenNotifications((v) => !v)}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none">
                <path
                  d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
            {notificationCount ? (
              <span
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-neon-cyan shadow-neon-cyan"
                aria-hidden="true"
              />
            ) : null}
          </div>
          <IconButton label="Settings" onClick={() => setOpenSettings(true)}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none">
              <path
                d="M12 15.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M19.4 15a8.3 8.3 0 0 0 .1-1 8.3 8.3 0 0 0-.1-1l2-1.6-2-3.5-2.4 1a7.2 7.2 0 0 0-1.7-1l-.3-2.6H9l-.3 2.6c-.6.3-1.2.6-1.7 1l-2.4-1-2 3.5 2 1.6a8.3 8.3 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.6 2 3.5 2.4-1c.5.4 1.1.7 1.7 1l.3 2.6h6l.3-2.6c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.6Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
                opacity="0.9"
              />
            </svg>
          </IconButton>

          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <div className="hidden text-right sm:block">
                <div className="text-xs font-semibold text-zinc-100">
                  {user.displayName || user.username}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {user.isGuest ? 'Guest' : 'Logged in'}
                </div>
              </div>
              <Avatar
                name={user.displayName || user.username}
                hue={user.avatarHue}
                avatarId={user.avatarId}
                className="size-9"
                label="Profile avatar"
              />
            </div>
          ) : (
            <Link to="/login" className="glass-button px-3 py-2 text-xs">
              Login
            </Link>
          )}
        </div>
      </div>
      </header>

      <NotificationPanel open={openNotifications} onClose={() => setOpenNotifications(false)} />

      {openSettings ? (
        <SettingsModal open={openSettings} onClose={() => setOpenSettings(false)} />
      ) : null}
    </>
  )
}
