function initials(name) {
  const n = String(name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(' ').filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function Avatar({
  name,
  hue = 200,
  avatarId,
  className = '',
  label = 'Avatar',
}) {
  const gradient = `linear-gradient(135deg, hsl(${hue} 90% 55% / 0.85), hsl(${(hue + 60) % 360} 90% 55% / 0.55))`

  return (
    <div
      className={[
        'relative grid place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-glass',
        className,
      ].join(' ')}
      style={avatarId ? undefined : { background: gradient }}
      aria-label={label}
    >
      {avatarId ? (
        <img
          src={`/avatars/${avatarId}.svg`}
          alt=""
          className="h-full w-full object-cover"
          draggable="false"
        />
      ) : (
        <span className="text-xs font-bold text-white">{initials(name)}</span>
      )}
    </div>
  )
}

