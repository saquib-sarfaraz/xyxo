import { Router } from 'express'
import { updateStats, updateDrawStats } from '../services/stats.service.js'

function emitLeaderboardUpdate(io) {
  io?.emit('leaderboard:update', { at: Date.now() })
}

/**
 * POST /api/stats/game
 * Body: { winnerId, loserId }
 * Call this from your game server when a ranked match completes.
 * Optional: STATS_API_KEY — send header X-Stats-Key
 */
export function createStatsRouter({ io, requireStatsKey }) {
  const router = Router()

  router.post('/game', async (req, res) => {
    if (requireStatsKey) {
      const key = req.get('x-stats-key') || req.get('X-Stats-Key')
      if (key !== requireStatsKey) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
    }

    const winnerId = req.body?.winnerId
    const loserId = req.body?.loserId

    try {
      await updateStats(winnerId, loserId)
      emitLeaderboardUpdate(io)
      return res.json({ ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update stats'
      return res.status(400).json({ error: message })
    }
  })

  /**
   * POST /api/stats/draw
   * Body: { player1Id, player2Id }
   * Call this when a match ends in a draw.
   */
  router.post('/draw', async (req, res) => {
    if (requireStatsKey) {
      const key = req.get('x-stats-key') || req.get('X-Stats-Key')
      if (key !== requireStatsKey) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
    }

    const player1Id = req.body?.player1Id
    const player2Id = req.body?.player2Id

    try {
      await updateDrawStats(player1Id, player2Id)
      emitLeaderboardUpdate(io)
      return res.json({ ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update draw stats'
      return res.status(400).json({ error: message })
    }
  })

  return router
}
