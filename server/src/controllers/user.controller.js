import mongoose from 'mongoose'
import { User } from '../models/User.model.js'
import { Match } from '../models/Match.model.js'

export async function getUserStats(req, res) {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid user ID' })
  }

  const user = await User.findById(id).select('name username avatar region stats').lean()

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const stats = user.stats || {}
  const wins = stats.wins || 0
  const losses = stats.losses || 0
  const draws = stats.draws || 0
  const total = wins + losses + draws

  let rank = 1
  try {
    const [result] = await User.aggregate([
      { $addFields: { totalXp: { $ifNull: ['$stats.xp', 0] } } },
      { $sort: { totalXp: -1 } },
      {
        $group: {
          _id: null,
          ids: { $push: '$_id' },
        },
      },
    ])
    if (result) {
      const idx = result.ids.findIndex((uid) => String(uid) === String(id))
      if (idx !== -1) rank = idx + 1
    }
  } catch {
    // ignore aggregation errors
  }

  const recentMatches = await Match.find({
    players: id,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

  res.json({
    userId: String(user._id),
    name: user.name || user.username || 'Player',
    username: user.username || '',
    avatar: user.avatar || '',
    region: user.region || 'global',
    rank,
    stats: {
      wins,
      losses,
      draws,
      totalGames: total,
      xp: stats.xp || 0,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      currentStreak: stats.currentStreak || 0,
      bestStreak: stats.bestStreak || 0,
      lastResult: stats.lastResult || null,
    },
    recentMatches: recentMatches.map((m) => ({
      id: String(m._id),
      result: m.result,
      finishedAt: m.finishedAt,
      createdAt: m.createdAt,
    })),
  })
}

export async function getCurrentUser(req, res) {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('name username avatar region stats').lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = user.stats || {};
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    const draws = stats.draws || 0;
    const totalGames = wins + losses + draws;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    
    res.json({
      id: String(user._id),
      username: user.username,
      displayName: user.name || user.username,
      isGuest: false,
      authProvider: 'backend',
      avatarId: user.avatar || '',
      avatarHue: 0,
      region: user.region || 'global',
      stats: {
        wins,
        losses,
        draws,
        xp: stats.xp || 0,
        currentStreak: stats.currentStreak || 0,
        bestStreak: stats.bestStreak || 0,
        lastResult: stats.lastResult || null,
        totalGames,
        winRate,
      },
    });
  } catch (error) {
    console.error('[USER] getCurrentUser error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}