import mongoose from 'mongoose'
import { User } from '../models/User.model.js'
import { FriendRequest } from '../models/FriendRequest.model.js'

export async function sendFriendRequest(req, res) {
  const senderId = req.user?.id || req.body?.senderId
  const receiverId = req.body?.receiverId

  if (!senderId || !receiverId) {
    return res.status(400).json({ error: 'Missing senderId or receiverId' })
  }

  if (senderId === receiverId) {
    return res.status(400).json({ error: 'Cannot send friend request to yourself' })
  }

  const senderOid = new mongoose.Types.ObjectId(senderId)
  const receiverOid = new mongoose.Types.ObjectId(receiverId)

  const existing = await FriendRequest.findOne({
    $or: [
      { sender: senderOid, receiver: receiverOid },
      { sender: receiverOid, receiver: senderOid },
    ],
    status: 'pending',
  })

  if (existing) {
    return res.status(400).json({ error: 'Friend request already exists' })
  }

  const alreadyFriends = await User.findOne({
    _id: senderOid,
    friends: receiverOid,
  })

  if (alreadyFriends) {
    return res.status(400).json({ error: 'Already friends' })
  }

  const request = await FriendRequest.create({
    sender: senderOid,
    receiver: receiverOid,
  })

  res.json({ request: { _id: request._id, sender: senderId, receiver: receiverId, status: 'pending' } })
}

export async function acceptFriendRequest(req, res) {
  const userId = req.user?.id || req.body?.userId
  const { requestId } = req.params

  if (!userId || !requestId) {
    return res.status(400).json({ error: 'Missing userId or requestId' })
  }

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({ error: 'Invalid request ID' })
  }

  const request = await FriendRequest.findById(requestId)

  if (!request) {
    return res.status(404).json({ error: 'Friend request not found' })
  }

  const userOid = new mongoose.Types.ObjectId(userId)

  if (request.receiver.toString() !== userOid.toString()) {
    return res.status(403).json({ error: 'Not authorized to accept this request' })
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request already processed' })
  }

  const senderOid = request.sender
  const receiverOid = request.receiver

  await Promise.all([
    User.findByIdAndUpdate(senderOid, { $addToSet: { friends: receiverOid } }),
    User.findByIdAndUpdate(receiverOid, { $addToSet: { friends: senderOid } }),
  ])

  request.status = 'accepted'
  await request.save()

  res.json({ ok: true, friendship: { user1: senderOid, user2: receiverOid } })
}

export async function listFriends(req, res) {
  const userId = req.user?.id || req.query?.userId

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' })
  }

  const user = await User.findById(userId).populate('friends', 'username name avatar region')

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const friends = (user.friends || []).map((f) => ({
    _id: f._id,
    username: f.username,
    name: f.name,
    avatar: f.avatar,
    region: f.region,
  }))

  res.json({ friends })
}

export async function listPendingRequests(req, res) {
  const userId = req.user?.id || req.query?.userId

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' })
  }

  const userOid = new mongoose.Types.ObjectId(userId)

  const requests = await FriendRequest.find({
    receiver: userOid,
    status: 'pending',
  })
    .populate('sender', 'username name avatar')
    .lean()

  const formatted = requests.map((r) => ({
    _id: r._id,
    sender: r.sender ? { _id: r.sender._id, username: r.sender.username, name: r.sender.name, avatar: r.sender.avatar } : null,
    receiver: userId,
    status: r.status,
  }))

  res.json({ requests: formatted })
}