import { motion as Motion } from 'framer-motion'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useUserStore } from '../store/useUserStore'

function TabButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={[
        'glass-button flex-1 px-4 py-2 text-xs',
        active ? 'nav-active' : '',
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const continueAsGuest = useUserStore((s) => s.continueAsGuest)
  const syncFromBackend = useUserStore((s) => s.syncFromBackend)

  const token = useAuthStore((s) => s.token)
  const signup = useAuthStore((s) => s.signup)
  const login = useAuthStore((s) => s.login)
  const authStatus = useAuthStore((s) => s.status)
  const authError = useAuthStore((s) => s.error)

  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const next = location?.state?.next
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : '/'

  if (token) return <Navigate to={safeNext} replace />

  const submit = async (e) => {
    e.preventDefault()
    const fn = mode === 'signup' ? signup : login
    const payload = mode === 'signup' ? { name, username, password } : { username, password }
    const res = await fn(payload)
    if (res?.ok) {
      if (res?.user) syncFromBackend(res.user)
      navigate(safeNext, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-app-bg bg-neon-radial px-4 py-10">
      <Motion.div
        className="mx-auto w-full max-w-lg space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="glass-panel p-6">
          <div className="font-display text-2xl font-bold text-zinc-100">
            Login / Signup
          </div>
          <div className="mt-2 text-sm text-zinc-300">
            Signup / Login via backend (MongoDB) with local guest fallback.
          </div>

          <div className="mt-5 flex gap-2">
            <TabButton active={mode === 'login'} onClick={() => setMode('login')}>
              Login
            </TabButton>
            <TabButton active={mode === 'signup'} onClick={() => setMode('signup')}>
              Signup
            </TabButton>
          </div>

          <form className="mt-5 space-y-3" onSubmit={submit}>
            {mode === 'signup' ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-cyan/40 focus:ring-2 focus:ring-neon-cyan/25"
              />
            ) : null}
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-cyan/40 focus:ring-2 focus:ring-neon-cyan/25"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 shadow-glass outline-none placeholder:text-zinc-500 focus:border-neon-purple/40 focus:ring-2 focus:ring-neon-purple/20"
            />

            {authError ? (
              <div className="rounded-xl border border-neon-purple/30 bg-neon-purple/10 p-3 text-sm text-zinc-100">
                {authError}
              </div>
            ) : null}

            <button
              type="submit"
              className="glass-button nav-active w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={authStatus === 'loading'}
            >
              {authStatus === 'loading'
                ? 'Working…'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Login'}
            </button>
          </form>

          <div className="neon-divider my-6" />

          <button
            type="button"
            className="glass-button w-full px-4 py-3"
            onClick={() => {
              continueAsGuest(username)
              navigate('/')
            }}
          >
            Continue as guest
          </button>
        </div>
      </Motion.div>
    </div>
  )
}
