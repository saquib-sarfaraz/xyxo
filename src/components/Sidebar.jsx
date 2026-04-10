import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Play', to: '/play/local' },
  { label: 'Friends', to: '/friends' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Stats', to: '/stats' },
]

function NavItem({ label, to }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center justify-between rounded-xl border border-white/10 bg-white/0 px-3 py-2 text-sm font-semibold text-zinc-200 transition',
          isActive ? 'nav-active' : 'hover:border-white/20 hover:bg-white/5',
        ].join(' ')
      }
    >
      <span>{label}</span>
      <span className="text-xs text-zinc-400">{to === '/play/local' ? '⌁' : '↗'}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col gap-4 glass-panel p-4 lg:flex">
        <div className="px-2 pt-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Navigation
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-400">
          Developed by Saquib Sarfaraz
        </div>
      </aside>

      <nav className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-2 glass-panel p-2 lg:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'rounded-xl border border-white/10 bg-white/0 px-3 py-2 text-xs font-semibold text-zinc-200 transition',
                isActive ? 'nav-active' : 'hover:border-white/20 hover:bg-white/5',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
