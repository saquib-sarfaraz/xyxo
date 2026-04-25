import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { login, signup, logout as logoutApi } from '../api/auth.api'
import { fetchMe } from '../api/user.api'
import { AUTH_TOKEN_UPDATED_EVENT, REFRESH_TOKEN_KEY, TOKEN_KEY } from '../api/axios'

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token')
  } catch {
    return null
  }
}

function writeToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('token')
    }
  } catch {
    // ignore
  }
}

function clearAllTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('token')
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // ignore
  }
}

function errorMessage(err) {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Request failed'
  return String(msg)
}

function extractAuthPayload(data) {
  if (!data || typeof data !== 'object') return { token: null, user: null }
  const root = data
  const nested = data.data && typeof data.data === 'object' ? data.data : null
  const token =
    root.token ||
    root.accessToken ||
    root.jwt ||
    nested?.token ||
    nested?.accessToken ||
    nested?.jwt ||
    null
  const user =
    (root.user && typeof root.user === 'object' ? root.user : null) ||
    (nested?.user && typeof nested.user === 'object' ? nested.user : null) ||
    null
  return { token, user }
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: readToken(),
      user: null,
      hydrated: false,
      status: 'idle',
      error: null,

      setHydrated: (hydrated) => set({ hydrated: Boolean(hydrated) }),

      setToken: (token) => {
        writeToken(token)
        set({ token })
      },

      signup: async (payload) => {
        set({ status: 'loading', error: null })
        try {
          const data = await signup(payload)
          const { token, user } = extractAuthPayload(data)
          if (!token) {
            const msg = 'Signup succeeded but no auth token was returned'
            set({ status: 'error', error: msg, user: user || null })
            return { ok: false, error: msg }
          }
          get().setToken(token)
          const meRes = await get().fetchMe()
          if (!meRes?.ok) {
            return { ok: false, error: meRes?.error || 'Failed to load profile' }
          }
          return { ok: true, user: meRes.user }
        } catch (err) {
          const msg = errorMessage(err)
          set({ status: 'error', error: msg })
          return { ok: false, error: msg }
        }
      },

      login: async (payload) => {
        set({ status: 'loading', error: null })
        try {
          const data = await login(payload)
          const { token, user } = extractAuthPayload(data)
          if (!token) {
            const msg = 'Login succeeded but no auth token was returned'
            set({ status: 'error', error: msg, user: user || null })
            return { ok: false, error: msg }
          }
          get().setToken(token)
          const meRes = await get().fetchMe()
          if (!meRes?.ok) {
            return { ok: false, error: meRes?.error || 'Failed to load profile' }
          }
          return { ok: true, user: meRes.user }
        } catch (err) {
          const msg = errorMessage(err)
          set({ status: 'error', error: msg })
          return { ok: false, error: msg }
        }
      },

      fetchMe: async () => {
        const token = get().token
        if (!token) return { ok: false, error: 'Missing token' }

        set({ status: 'loading', error: null })
        try {
          const data = await fetchMe()
          const me = data?.user && typeof data.user === 'object' ? data.user : data
          set({ user: me, status: 'ready' })
          return { ok: true, user: me }
        } catch (err) {
          const msg = errorMessage(err)
          set({ status: 'error', error: msg, user: null })
          return { ok: false, error: msg }
        }
      },

      logout: async () => {
        try {
          await logoutApi();
        } catch (err) {
          console.error('[AUTH] Logout API error:', err);
        } finally {
          writeToken(null)
          // Note: refresh token is cleared via httpOnly cookie on server
          set({ token: null, user: null, status: 'idle', error: null })
        }
      },

      clearAuth: () => {
        clearAllTokens();
        set({ token: null, user: null, status: 'idle', error: null });
      },
    }),
    {
      name: 'ttpro:auth',
      version: 1,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState && typeof persistedState === 'object' ? persistedState : {}
        return { ...currentState, ...persisted, token: currentState.token }
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  const KEY = '__ttproAuthTokenListener'
  if (!window[KEY]) {
    window[KEY] = true
    window.addEventListener(AUTH_TOKEN_UPDATED_EVENT, (e) => {
      const token = e?.detail?.token
      if (typeof token === 'string' && token.trim()) {
        useAuthStore.getState().setToken(token)
        return
      }
      useAuthStore.getState().clearAuth()
    })
  }
}
