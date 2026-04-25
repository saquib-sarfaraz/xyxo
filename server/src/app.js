import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import leaderboardRoutes from './routes/leaderboard.routes.js'
import userRoutes from './routes/user.routes.js'
import friendRoutes from './routes/friend.routes.js'
import { createStatsRouter } from './routes/stats.routes.js'
import authRoutes from './routes/auth.routes.js'
import { verifyToken } from './middleware/auth.middleware.js'

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
  app.use(cookieParser())

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'xyxo-api', env: isProduction ? 'production' : 'development' })
  })

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() })
  })

  // Auth routes
  app.use('/api/auth', authRoutes)

  /** Leaderboard API:
   * - GET /api/leaderboard (lifetime)
   * - GET /api/leaderboard/rolling (7-day rolling)
   */
  app.use('/api/leaderboard', leaderboardRoutes)
  /** User stats API:
   * - GET /api/users/:id/stats
   * - GET /api/users/me (current user profile)
   */
  app.use('/api/users', userRoutes)
  app.use('/api/stats', createStatsRouter({ io, requireStatsKey }))
  /** Friend API (requires auth):
   * - POST /api/friends/requests (send friend request)
   * - POST /api/friends/requests/:requestId/accept
   * - GET /api/friends (list friends)
   * - GET /api/friends/requests/pending (pending requests)
   */
  app.use('/api/friends', verifyToken, friendRoutes)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use((err, _req, res, _next) => {
    console.error('[error]', err?.message || err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
