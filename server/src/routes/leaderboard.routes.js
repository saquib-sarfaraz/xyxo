import { Router } from 'express'
import { listLifetimeLeaderboard, listRollingLeaderboard } from '../controllers/leaderboard.controller.js'

const router = Router()

// Backwards-compatible:
// - Without ?days → lifetime leaderboard
// - With ?days=1..7 → rolling leaderboard (matches some client implementations)
router.get('/', (req, res) => {
  const daysRaw = req.query?.days
  if (daysRaw != null && String(daysRaw).trim()) {
    return listRollingLeaderboard(req, res)
  }
  return listLifetimeLeaderboard(req, res)
})
router.get('/rolling', listRollingLeaderboard)

export default router
