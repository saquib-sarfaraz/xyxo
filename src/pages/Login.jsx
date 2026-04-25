import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useUserStore } from '../store/useUserStore'

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

function isProbablyEmail(value) {
  return String(value ?? '').includes('@')
}

function isValidEmail(value) {
  const s = String(value ?? '').trim().toLowerCase()
  if (!s) return false
  if (s.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)
}

function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase()
}

function passwordStrength(password) {
  const p = String(password ?? '')
  if (!p) return { score: 0, percent: 0, label: 'Weak', tone: 'danger' }

  let score = 0
  if (p.length >= 8) score += 1
  if (p.length >= 12) score += 1
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1
  if (/\d/.test(p)) score += 1
  if (/[^A-Za-z0-9]/.test(p)) score += 1

  const clamped = Math.max(0, Math.min(score, 5))
  const label = clamped <= 2 ? 'Weak' : clamped <= 4 ? 'Medium' : 'Strong'
  const tone = clamped <= 2 ? 'danger' : clamped <= 4 ? 'warn' : 'good'
  return { score: clamped, percent: (clamped / 5) * 100, label, tone }
}

function validateAuthForm({ mode, name, identifier, password }) {
  const errors = {}
  const isSignup = mode === 'signup'

  const n = String(name ?? '').trim()
  const id = String(identifier ?? '').trim()
  const pwd = String(password ?? '')

  if (isSignup) {
    if (!n) errors.name = 'Name is required.'
    else if (n.length > 80) errors.name = 'Name must be 80 characters or less.'
  }

  if (!id) {
    errors.identifier = 'Username or email is required.'
  } else if (isProbablyEmail(id)) {
    if (!isValidEmail(id)) errors.identifier = 'Enter a valid email address.'
  } else if (isSignup) {
    const u = normalizeUsername(id)
    if (u.length < 3) errors.identifier = 'Username must be at least 3 characters.'
    else if (u.length > 24) errors.identifier = 'Username must be 24 characters or less.'
    else if (!USERNAME_REGEX.test(u)) {
      errors.identifier = 'Only letters, numbers, and _ are allowed.'
    }
  }

  if (!pwd) {
    errors.password = 'Password is required.'
  } else if (isSignup) {
    if (pwd.length < 8) errors.password = 'Password must be at least 8 characters.'
    else if (pwd.length > 72) errors.password = 'Password must be 72 characters or less.'
  }

  return errors
}

function buildAuthPayload({ mode, name, identifier, password }) {
  const isSignup = mode === 'signup'
  const id = String(identifier ?? '').trim()
  const payload = { password: String(password ?? '') }

  if (isSignup) payload.name = String(name ?? '').trim()

  if (isProbablyEmail(id)) payload.email = id.toLowerCase()
  else payload.username = normalizeUsername(id)

  return payload
}

function FloatingField({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  autoComplete,
  inputMode,
  error,
  hint,
  accent = 'cyan',
  right,
  rightPadding = 'pr-4',
  ...props
}) {
  const errorBorder = 'border-rose-400/30 focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/25'
  const accentBorder =
    accent === 'purple'
      ? 'focus:border-neon-purple/40 focus:ring-2 focus:ring-neon-purple/20'
      : 'focus:border-neon-cyan/40 focus:ring-2 focus:ring-neon-cyan/25'

  const labelAccent =
    accent === 'purple' ? 'peer-focus:text-neon-purple' : 'peer-focus:text-neon-cyan'

  const labelTone = error ? 'text-rose-300 peer-focus:text-rose-300' : labelAccent

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder=" "
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={[
            'peer w-full rounded-xl border bg-white/5 px-4 pb-3 pt-5 text-sm text-zinc-100 shadow-glass outline-none transition',
            'placeholder:text-transparent',
            rightPadding,
            error ? errorBorder : `border-white/10 ${accentBorder}`,
          ].join(' ')}
          {...props}
        />
        <label
          htmlFor={id}
          className={[
            'pointer-events-none absolute left-4 top-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 transition-all',
            'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-zinc-500',
            'peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wide',
            labelTone,
          ].join(' ')}
        >
          {label}
        </label>

        {right ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
        ) : null}
      </div>

      {error ? (
        <div id={`${id}-error`} className="text-xs text-rose-300">
          {error}
        </div>
      ) : hint ? (
        <div id={`${id}-hint`} className="text-xs text-zinc-400">
          {hint}
        </div>
      ) : null}
    </div>
  )
}

function TabButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={[
        'glass-button flex-1 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60',
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
  const [form, setForm] = useState({ name: '', identifier: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ name: false, identifier: false, password: false })
  const [attempted, setAttempted] = useState(false)
  const [dirtySinceSubmit, setDirtySinceSubmit] = useState(false)

  const next = location?.state?.next
  const safeNext = typeof next === 'string' && next.startsWith('/') ? next : '/'

  const isSignup = mode === 'signup'

  const idKind = useMemo(() => {
    const id = String(form.identifier ?? '').trim()
    if (!id) return null
    return isProbablyEmail(id) ? 'email' : 'username'
  }, [form.identifier])

  const strength = useMemo(() => passwordStrength(form.password), [form.password])

  const validation = useMemo(() => {
    return validateAuthForm({
      mode,
      name: form.name,
      identifier: form.identifier,
      password: form.password,
    })
  }, [form.identifier, form.name, form.password, mode])

  const showFieldError = (key) => {
    if (!attempted && !touched[key]) return null
    return validation[key] || null
  }

  const setField = (key) => (e) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirtySinceSubmit(true)
  }

  const touch = (key) => () => setTouched((t) => ({ ...t, [key]: true }))

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setAttempted(false)
    setTouched({ name: false, identifier: false, password: false })
    setDirtySinceSubmit(false)
    setShowPassword(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (authStatus === 'loading') return

    setAttempted(true)
    const nextValidation = validateAuthForm({
      mode,
      name: form.name,
      identifier: form.identifier,
      password: form.password,
    })
    if (Object.keys(nextValidation).length) return

    setDirtySinceSubmit(false)
    const fn = isSignup ? signup : login
    const payload = buildAuthPayload({
      mode,
      name: form.name,
      identifier: form.identifier,
      password: form.password,
    })
    const res = await fn(payload)
    if (res?.ok) {
      if (res?.user) syncFromBackend(res.user)
      navigate(safeNext, { replace: true })
    }
  }

  const title = isSignup ? 'Create account' : 'Welcome back'
  const subtitle = isSignup
    ? 'Use a username or your email — whichever you prefer.'
    : 'Sign in with your username or email.'

  const guestName = (() => {
    const id = String(form.identifier ?? '').trim()
    if (id) return isProbablyEmail(id) ? id.split('@')[0] : id
    const n = String(form.name ?? '').trim()
    return n || ''
  })()

  const strengthTone =
    strength.tone === 'danger'
      ? 'danger-bar'
      : strength.tone === 'warn'
        ? 'bg-amber-400/70'
        : 'neon-bar'

  if (token) return <Navigate to={safeNext} replace />

  return (
    <div className="min-h-screen bg-app-bg bg-neon-radial px-4 py-10">
      <Motion.div
        className="mx-auto w-full max-w-lg space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="glass-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-display text-2xl font-bold text-zinc-100">{title}</div>
              <div className="mt-2 text-sm text-zinc-300">{subtitle}</div>
            </div>
            <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-zinc-300 sm:flex">
              <span className="size-1.5 rounded-full bg-neon-cyan/70 shadow-neon-cyan" />
              Online auth
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <TabButton
              active={mode === 'login'}
              onClick={() => changeMode('login')}
              disabled={authStatus === 'loading'}
            >
              Login
            </TabButton>
            <TabButton
              active={mode === 'signup'}
              onClick={() => changeMode('signup')}
              disabled={authStatus === 'loading'}
            >
              Signup
            </TabButton>
          </div>

          <form className="mt-5 space-y-3" onSubmit={submit}>
            <AnimatePresence initial={false}>
              {isSignup ? (
                <Motion.div
                  key="name"
                  className="overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <FloatingField
                    id="name"
                    label="Name"
                    value={form.name}
                    onChange={setField('name')}
                    onBlur={touch('name')}
                    autoComplete="name"
                    error={showFieldError('name')}
                    hint="Your display name (80 chars max)."
                  />
                </Motion.div>
              ) : null}
            </AnimatePresence>

            <FloatingField
              id="identifier"
              label="Username or email"
              value={form.identifier}
              onChange={setField('identifier')}
              onBlur={touch('identifier')}
              autoComplete={idKind === 'email' ? 'email' : 'username'}
              inputMode={idKind === 'email' ? 'email' : 'text'}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              error={showFieldError('identifier')}
              hint={
                idKind
                  ? `Sending as ${idKind === 'email' ? 'email' : 'username'}`
                  : 'We’ll detect email automatically.'
              }
              rightPadding="pr-20"
              right={
                idKind ? (
                  <div className="pointer-events-none rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                    {idKind}
                  </div>
                ) : null
              }
            />

            <div className="space-y-2">
              <FloatingField
                id="password"
                label="Password"
                value={form.password}
                onChange={setField('password')}
                onBlur={touch('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                error={showFieldError('password')}
                accent="purple"
                rightPadding="pr-14"
                right={
                  <button
                    type="button"
                    className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="size-4"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      {showPassword ? (
                        <path
                          d="M4 4l16 16"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      ) : null}
                    </svg>
                  </button>
                }
              />

              {isSignup ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Strength
                    </div>
                    <div className="text-xs font-semibold text-zinc-200">
                      {strength.label}
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/35">
                    <div
                      className={['h-full rounded-full transition-all', strengthTone].join(' ')}
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    Use 8+ characters. Add numbers/symbols for stronger passwords.
                  </div>
                </div>
              ) : null}
            </div>

            {authError && !dirtySinceSubmit ? (
              <div className="rounded-xl border border-neon-purple/30 bg-neon-purple/10 p-3 text-sm text-zinc-100">
                {authError}
              </div>
            ) : null}

            <button
              type="submit"
              className="glass-button nav-active w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={authStatus === 'loading'}
            >
              {authStatus === 'loading' ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="size-4 animate-spin rounded-full border border-white/30 border-t-white/80" />
                  Working…
                </span>
              ) : isSignup ? (
                'Create account'
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div className="neon-divider my-6" />

          <button
            type="button"
            className="glass-button w-full px-4 py-3"
            onClick={() => {
              continueAsGuest(guestName)
              navigate('/')
            }}
            disabled={authStatus === 'loading'}
          >
            Continue as guest
          </button>
        </div>
      </Motion.div>
    </div>
  )
}
