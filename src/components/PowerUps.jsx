import { motion as Motion } from 'framer-motion'

function PowerButton({ label, icon, count, onClick, disabled, active }) {
  return (
    <Motion.button
      type="button"
      className={[
        'glass-button w-full justify-between px-4 py-3 text-sm',
        active ? 'nav-active' : '',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ].join(' ')}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    >
      <span className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span>{label}</span>
      </span>
      <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-200">
        {count}
      </span>
    </Motion.button>
  )
}

export default function PowerUps({
  onFreeze,
  onRemove,
  counts,
  removeArmed,
  freezeQueued,
  disabled,
}) {
  const freezeCount = counts?.freeze ?? 0
  const removeCount = counts?.remove ?? 0
  const disableAll = Boolean(disabled)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <PowerButton
        label={freezeQueued ? 'Freeze queued' : 'Freeze'}
        icon="❄️"
        count={freezeCount}
        onClick={onFreeze}
        disabled={disableAll || freezeCount <= 0 || freezeQueued}
      />
      <PowerButton
        label={removeArmed ? 'Remove (tap tile)' : 'Remove'}
        icon="💥"
        count={removeCount}
        onClick={onRemove}
        disabled={disableAll || removeCount <= 0}
        active={removeArmed}
      />
    </div>
  )
}
