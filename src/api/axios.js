import axios from 'axios'

export const TOKEN_KEY = 'ttpro:token'

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token')
  } catch {
    return null
  }
}

/**
 * Ensures requests hit .../api/leaderboard, not .../leaderboard.
 * Common mistake: VITE_API_URL=http://localhost:5001 (missing /api) → 404 on every route.
 */
function normalizeApiBaseUrl(raw) {
  const fallback = 'http://localhost:5001/api'
  const s = String(raw ?? '').trim()
  if (!s) return fallback
  if (s.startsWith('/')) {
    const path = s.replace(/\/$/, '') || '/api'
    if (path === '/api' || path.startsWith('/api/')) return path
    return '/api'
  }
  try {
    const u = new URL(s)
    const p = (u.pathname || '').replace(/\/$/, '') || ''
    if (p === '' || p === '/') {
      u.pathname = '/api'
    }
    return u.href.replace(/\/$/, '')
  } catch {
    return fallback
  }
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12_000,
})

API.interceptors.request.use((config) => {
  const token = readToken()
  if (!token) return config

  const raw = String(token).trim()
  const authValue = raw.toLowerCase().startsWith('bearer ') ? raw : `Bearer ${raw}`

  return {
    ...config,
    headers: {
      ...config.headers,
      Authorization: authValue,
    },
  }
})

export default API
