import express from 'express'
import cors from 'cors'
import leaderboardRoutes from './routes/leaderboard.routes.js'
import userRoutes from './routes/user.routes.js'
import friendRoutes from './routes/friend.routes.js'
import { createStatsRouter } from './routes/stats.routes.js'

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    if (payload?.id || payload?._id) {
      req.user = { id: payload.id || payload._id }
      return next()
    }
    return res.status(401).json({ error: 'Invalid token payload' })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function getCorsOrigins() {
  const clientUrl = process.env.CLIENT_URL?.trim()
  if (clientUrl) return [clientUrl, clientUrl.replace(/^https?/, 'https://'), clientUrl.replace(/^https?/, 'http://')]
  return (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function createApp({ io } = {}) {
  const app = express()
  const requireStatsKey = process.env.STATS_API_KEY?.trim() || null
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    app.set('trust proxy', 1)
  }

  const origins = getCorsOrigins()

  app.use(
    cors({
      origin: origins.length ? origins : true,
      credentials: true,
    }),
  )
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'xyxo-api', env: isProduction ? 'production' : 'development' })
  })

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() })
  })

  /** Leaderboard API:
   * - GET /api/leaderboard (lifetime)
   * - GET /api/leaderboard/rolling (7-day rolling)
   */
  app.use('/api/leaderboard', leaderboardRoutes)
  /** User stats API:
   * - GET /api/users/:id/stats
   */
  app.use('/api/users', userRoutes)
  app.use('/api/stats', createStatsRouter({ io, requireStatsKey }))
  /** Friend API (requires auth):
   * - POST /api/friends/requests (send friend request)
   * - POST /api/friends/requests/:requestId/accept
   * - GET /api/friends (list friends)
   * - GET /api/friends/requests/pending (pending requests)
   */
  app.use('/api/friends', authMiddleware, friendRoutes)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use((err, _req, res, _next) => {
    console.error('[error]', err?.message || err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
