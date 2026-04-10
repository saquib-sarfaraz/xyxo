import { Router } from 'express'
import { sendFriendRequest, acceptFriendRequest, listFriends, listPendingRequests } from '../controllers/friend.controller.js'

const router = Router()

router.post('/requests', sendFriendRequest)
router.post('/requests/:requestId/accept', acceptFriendRequest)
router.get('/', listFriends)
router.get('/requests/pending', listPendingRequests)

export default router