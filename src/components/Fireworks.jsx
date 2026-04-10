function hashString(input) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export default function Fireworks({ seed = 'ttpro', count = 18 }) {
  const rng = mulberry32(hashString(String(seed)))

  const origins = [
    { x: 42, y: 58 },
    { x: 58, y: 46 },
    { x: 50, y: 34 },
  ]

  const particles = Array.from({ length: count }, (_, i) => {
    const origin = origins[i % origins.length]
    const x = clamp(origin.x + (rng() - 0.5) * 6, 15, 85)
    const y = clamp(origin.y + (rng() - 0.5) * 6, 15, 85)

    const angle = rng() * Math.PI * 2
    const distance = 90 + rng() * 130
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance

    const size = 4 + rng() * 4
    const delay = rng() * 0.35

    const palette = rng()
    const hue =
      palette < 0.5
        ? 185 + rng() * 18
        : palette < 0.85
          ? 278 + rng() * 22
          : 42 + rng() * 24

    return {
      key: `${i}`,
      style: {
        '--x': `${x}%`,
        '--y': `${y}%`,
        '--dx': `${dx.toFixed(1)}px`,
        '--dy': `${dy.toFixed(1)}px`,
        '--size': `${size.toFixed(1)}px`,
        '--hue': String(Math.round(hue)),
        '--delay': `${delay.toFixed(2)}s`,
      },
    }
  })

  return (
    <div className="fireworks-container" aria-hidden="true">
      {particles.map((p) => (
        <span key={p.key} className="firework-particle" style={p.style} />
      ))}
    </div>
  )
}

