import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const ACCOUNTS_KEY = 'ttpro:accounts'
const AVATAR_IDS = ['cyber1', 'neon2', 'ghost3', 'ember4', 'ultra5']

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function loadAccounts() {
  if (typeof localStorage === 'undefined') return {}
  return safeJsonParse(localStorage.getItem(ACCOUNTS_KEY) ?? '{}', {})
}

function saveAccounts(accounts) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function normalizeUsername(username) {
  return String(username ?? '').trim().replace(/\s+/g, ' ')
}

function pickAvatarId(preferred) {
  if (typeof preferred === 'string' && AVATAR_IDS.includes(preferred)) return preferred
  return AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)]
}

function makeUser({ id, username, displayName, isGuest, avatarHue, avatarId, stats }) {
  const hue =
    typeof avatarHue === 'number' && Number.isFinite(avatarHue)
      ? avatarHue
      : Math.floor(Math.random() * 360)
  const uid =
    id ??
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))

  return {
    id: uid,
    username,
    displayName: displayName || username,
    isGuest,
    authProvider: isGuest ? 'guest' : 'local', // guest | local | backend
    avatarId: pickAvatarId(avatarId),
    avatarHue: hue,
    stats: stats ?? { matches: 0, wins: 0, losses: 0, xp: 0 },
  }
}

function validateCredentials({ username, password }) {
  const u = normalizeUsername(username)
  const p = String(password ?? '')

  if (!u) return 'Username is required.'
  if (!p) return 'Password is required.'
  if (u.length < 3) return 'Username must be at least 3 characters.'
  if (p.length < 4) return 'Password must be at least 4 characters.'

  return null
}

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      authError: null,
      syncFromBackend: (backendUser) => {
        const backend = backendUser && typeof backendUser === 'object' ? backendUser : null
        const username = normalizeUsername(backend?.username)
        if (!username) return { ok: false, error: 'Missing username from backend.' }

        set((state) => {
          const existing = state.user
          const nextUser = makeUser({
            id: backend?._id || backend?.id || existing?.id,
            username,
            displayName:
              String(backend?.name ?? backend?.displayName ?? existing?.displayName ?? username).trim() ||
              username,
            isGuest: false,
            avatarHue: existing?.avatarHue,
            avatarId: existing?.avatarId,
            stats: existing?.stats,
          })

          return { user: { ...nextUser, authProvider: 'backend' }, authError: null }
        })

        return { ok: true }
      },

      signup: ({ name, username, password, avatarId }) => {
        const error = validateCredentials({ username, password })
        if (error) {
          set({ authError: error })
          return { ok: false, error }
        }

        const u = normalizeUsername(username)
        const accounts = loadAccounts()
        if (accounts[u]) {
          const msg = 'That username is already taken.'
          set({ authError: msg })
          return { ok: false, error: msg }
        }

        const displayName = String(name ?? '').trim() || u
        const newUser = makeUser({
          username: u,
          displayName,
          isGuest: false,
          avatarId: typeof avatarId === 'string' ? avatarId : 'cyber1',
        })

        accounts[u] = {
          password: String(password),
          profile: {
            id: newUser.id,
            displayName: newUser.displayName,
            avatarId: newUser.avatarId,
            avatarHue: newUser.avatarHue,
            stats: newUser.stats,
          },
        }
        saveAccounts(accounts)

        set({ user: newUser, authError: null })
        return { ok: true }
      },

      login: ({ username, password }) => {
        const error = validateCredentials({ username, password })
        if (error) {
          set({ authError: error })
          return { ok: false, error }
        }

        const u = normalizeUsername(username)
        const accounts = loadAccounts()
        const account = accounts[u]

        if (!account || account.password !== String(password)) {
          const msg = 'Invalid username or password.'
          set({ authError: msg })
          return { ok: false, error: msg }
        }

        const profile = account.profile ?? null
        const nextUser = makeUser({
          id: profile?.id,
          username: u,
          displayName: profile?.displayName ?? u,
          isGuest: false,
          avatarId: profile?.avatarId,
          avatarHue: profile?.avatarHue,
          stats: profile?.stats,
        })

        if (!account.profile) {
          accounts[u] = {
            ...account,
            profile: {
              id: nextUser.id,
              displayName: nextUser.displayName,
              avatarId: nextUser.avatarId,
              avatarHue: nextUser.avatarHue,
              stats: nextUser.stats,
            },
          }
          saveAccounts(accounts)
        }

        set({ user: nextUser, authError: null })
        return { ok: true }
      },

      continueAsGuest: (username) => {
        const u = normalizeUsername(username) || `Guest ${Math.floor(100 + Math.random() * 900)}`
        set({ user: makeUser({ username: u, isGuest: true }), authError: null })
      },

      logout: () => set({ user: null, authError: null }),

      updateProfile: ({ username, displayName, avatarHue, avatarId }) => {
        const current = get().user
        if (!current) return { ok: false, error: 'Not logged in.' }
        const provider = current.authProvider ?? (current.isGuest ? 'guest' : 'local')

        const patch = {}

        if (typeof avatarId === 'string' && AVATAR_IDS.includes(avatarId)) {
          patch.avatarId = avatarId
        }

        if (typeof avatarHue === 'number' && Number.isFinite(avatarHue)) {
          patch.avatarHue = ((avatarHue % 360) + 360) % 360
        }

        if (typeof displayName === 'string') {
          patch.displayName = displayName.trim() || current.username
        }

        if (typeof username === 'string') {
          const nextUsername = normalizeUsername(username)
          if (!nextUsername) return { ok: false, error: 'Username is required.' }

          if (nextUsername !== current.username) {
            if (provider === 'backend') {
              return { ok: false, error: 'Username is managed by the server.' }
            }

            if (!current.isGuest && provider === 'local') {
              const accounts = loadAccounts()
              if (accounts[nextUsername]) {
                return { ok: false, error: 'That username is already taken.' }
              }
              accounts[nextUsername] = accounts[current.username]
              delete accounts[current.username]
              saveAccounts(accounts)
            }

            patch.username = nextUsername
            patch.displayName = patch.displayName ?? nextUsername
          }
        }

        const nextUser = { ...current, ...patch }
        if (!current.isGuest && provider === 'local') {
          const accounts = loadAccounts()
          const account = accounts[nextUser.username]
          if (account) {
            accounts[nextUser.username] = {
              ...account,
              profile: {
                ...(account.profile ?? {}),
                id: nextUser.id,
                displayName: nextUser.displayName,
                avatarId: nextUser.avatarId,
                avatarHue: nextUser.avatarHue,
                stats: nextUser.stats,
              },
            }
            saveAccounts(accounts)
          }
        }

        set({ user: nextUser, authError: null })
        return { ok: true }
      },

      updatePassword: ({ currentPassword, newPassword }) => {
        const current = get().user
        if (!current) return { ok: false, error: 'Not logged in.' }
        if (current.isGuest) return { ok: false, error: 'Guests do not have a password.' }
        const provider = current.authProvider ?? (current.isGuest ? 'guest' : 'local')
        if (provider === 'backend') {
          return { ok: false, error: 'Password is managed by the server.' }
        }

        const next = String(newPassword ?? '')
        if (!next) return { ok: true }
        if (next.length < 4) return { ok: false, error: 'Password must be at least 4 characters.' }

        const accounts = loadAccounts()
        const account = accounts[current.username]
        if (!account) return { ok: false, error: 'Account not found.' }
        if (account.password !== String(currentPassword ?? '')) {
          return { ok: false, error: 'Current password is incorrect.' }
        }

        accounts[current.username] = { ...account, password: next }
        saveAccounts(accounts)
        return { ok: true }
      },

      recordMatchResult: ({ outcome }) => {
        set((state) => {
          if (!state.user) return state
          const provider = state.user.authProvider ?? (state.user.isGuest ? 'guest' : 'local')

          const stats = { ...(state.user.stats ?? {}) }
          stats.matches = (stats.matches ?? 0) + 1

          if (outcome === 'win') {
            stats.wins = (stats.wins ?? 0) + 1
            stats.xp = (stats.xp ?? 0) + 25
          } else if (outcome === 'loss') {
            stats.losses = (stats.losses ?? 0) + 1
            stats.xp = (stats.xp ?? 0) + 5
          } else {
            stats.xp = (stats.xp ?? 0) + 10
          }

          const nextUser = { ...state.user, stats }

          if (!state.user.isGuest && provider === 'local') {
            const accounts = loadAccounts()
            const account = accounts[state.user.username]
            if (account) {
              accounts[state.user.username] = {
                ...account,
                profile: {
                  ...(account.profile ?? {}),
                  id: nextUser.id,
                  displayName: nextUser.displayName,
                  avatarId: nextUser.avatarId,
                  avatarHue: nextUser.avatarHue,
                  stats: nextUser.stats,
                },
              }
              saveAccounts(accounts)
            }
          }

          return { user: nextUser }
        })
      },
    }),
    {
      name: 'ttpro:user',
      version: 1,
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
