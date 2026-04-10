import { Router } from 'express'
import { getUserStats } from '../controllers/user.controller.js'

const router = Router()

router.get('/:id/stats', getUserStats)

export default router