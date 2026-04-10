import { motion as Motion } from 'framer-motion'
import Avatar from './Avatar'

export default function FriendCard({ name, status, avatarHue, avatarId, onInvite }) {
  const isOnline = status === 'online' || status === 'in-game'
  const statusText =
    status === 'in-game' ? 'In game' : status === 'online' ? 'Online' : 'Offline'

  return (
    <Motion.div
      layout
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-xl"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      <div className="relative">
        <Avatar name={name} hue={avatarHue} avatarId={avatarId} className="size-10" />
        <span
          className={[
            'absolute -bottom-1 -right-1 size-3 rounded-full border border-app-bg',
            isOnline ? 'bg-neon-cyan shadow-neon-cyan animate-pulse-soft' : 'bg-zinc-500',
          ].join(' ')}
          aria-hidden="true"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-zinc-100">{name}</div>
        <div className="text-xs text-zinc-400">{statusText}</div>
      </div>

      <button
        type="button"
        className="glass-button px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!isOnline}
        onClick={onInvite}
      >
        Invite
      </button>
    </Motion.div>
  )
}
