import { Router } from 'express'
import { getUserStats, getCurrentUser } from '../controllers/user.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/me', verifyToken, getCurrentUser)
router.get('/:id/stats', getUserStats)

export default router