import API from './axios'

const ROLLING_PATH =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LEADERBOARD_PATH) ||
  '/leaderboard/rolling'

const LIFETIME_PATH =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LIFETIME_LEADERBOARD_PATH) ||
  '/leaderboard'

const DEFAULT_REGION =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LEADERBOARD_REGION) || 'eu'

const DEFAULT_DAYS_RAW =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LEADERBOARD_DAYS) || '7'
const DEFAULT_DAYS = Math.max(1, Math.min(7, Number(DEFAULT_DAYS_RAW) || 7))

/**
 * @param {'global'|'regional'} scope
 */
export async function fetchLeaderboard(scope = 'global') {
  const normalized = String(scope || 'global').trim().toLowerCase()
  const params = {}
  params.days = DEFAULT_DAYS
  if (normalized === 'regional') {
    params.region = DEFAULT_REGION
  }

  try {
    const res = await API.get(ROLLING_PATH, { params })
    const data = res.data
    if (Array.isArray(data?.leaderboard)) return data
    if (Array.isArray(data)) return { leaderboard: data }
    if (Array.isArray(data?.users)) return { leaderboard: data.users }
    return { leaderboard: [] }
  } catch (err) {
    const status = err?.response?.status
    if (status === 404) {
      const err404 = new Error(
        'Leaderboard API returned 404. Start `npm run server` from the repo (needs MongoDB). Ensure VITE_API_URL ends with /api (e.g. http://localhost:5001/api or /api with Vite proxy).',
      )
      err404.status = 404
      err404.isLeaderboard404 = true
      throw err404
    }
    throw err
  }
}

/**
 * @param {'global'|'regional'} scope
 */
export async function fetchLifetimeLeaderboard(scope = 'global') {
  const normalized = String(scope || 'global').trim().toLowerCase()
  const params = {}
  if (normalized === 'regional') {
    params.region = DEFAULT_REGION
  }

  const res = await API.get(LIFETIME_PATH, { params })
  const data = res.data
  if (Array.isArray(data?.leaderboard)) return data
  if (Array.isArray(data)) return { leaderboard: data }
  if (Array.isArray(data?.users)) return { leaderboard: data.users }
  return { leaderboard: [] }
}
