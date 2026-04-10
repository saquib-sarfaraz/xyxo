import { Match } from '../models/Match.model.js'
import { User } from '../models/User.model.js'

function clampInt(value, { min, max, fallback }) {
  const raw = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(raw)) return fallback
  return Math.min(Math.max(raw, min), max)
}

function computeWinRate(wins, losses) {
  const w = Number(wins) || 0
  const l = Number(losses) || 0
  const total = w + l
  if (total <= 0) return 0
  return Math.round((w / total) * 100)
}

/**
 * Lifetime leaderboard (from User.stats)
 * GET /api/leaderboard
 * Query: limit (default 50, 1..100), region (omit or "global" for all regions)
 */
export async function listLifetimeLeaderboard(req, res) {
  const limit = clampInt(req.query.limit ?? '50', { min: 1, max: 100, fallback: 50 })
  const regionRaw = String(req.query.region ?? '').trim().toLowerCase()
  const filter = regionRaw && regionRaw !== 'global' ? { region: req.query.region.trim() } : {}

  const users = await User.find(filter)
    .sort({ 'stats.xp': -1 })
    .limit(limit)
    .select('name username avatar region stats')
    .lean()

  const leaderboard = users.map((u, i) => {
    const wins = u.stats?.wins ?? 0
    const losses = u.stats?.losses ?? 0
    const xp = u.stats?.xp ?? 0
    return {
      rank: i + 1,
      _id: String(u._id),
      name: u.name || u.username || 'Player',
      username: u.username || '',
      avatar: u.avatar || '',
      region: u.region || 'global',
      xp,
      winRate: computeWinRate(wins, losses),
      stats: { wins, losses, xp },
    }
  })

  res.json({ leaderboard, type: 'lifetime' })
}

/**
 * Rolling leaderboard (from Match; max 7 days)
 * GET /api/leaderboard/rolling
 * Query: days (default 7, 1..7), limit (default 50, 1..100), region (omit or "global" for all regions)
 */
export async function listRollingLeaderboard(req, res) {
  const limit = clampInt(req.query.limit ?? '50', { min: 1, max: 100, fallback: 50 })
  const days = clampInt(req.query.days ?? '7', { min: 1, max: 7, fallback: 7 })
  const regionRaw = String(req.query.region ?? '').trim().toLowerCase()
  const regionFilter = regionRaw && regionRaw !== 'global' ? regionRaw : null
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const pipeline = [
    { $match: { createdAt: { $gte: since } } },
    {
      $project: {
        entries: [
          { userId: '$winner', wins: 1, losses: 0, xp: '$xpWinner' },
          { userId: '$loser', wins: 0, losses: 1, xp: '$xpLoser' },
        ],
      },
    },
    { $unwind: '$entries' },
    { $match: { 'entries.userId': { $ne: null } } },
    {
      $group: {
        _id: '$entries.userId',
        wins: { $sum: '$entries.wins' },
        losses: { $sum: '$entries.losses' },
        xp: { $sum: '$entries.xp' },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    ...(regionFilter ? [{ $match: { 'user.region': regionFilter } }] : []),
    { $sort: { xp: -1, wins: -1, losses: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        wins: 1,
        losses: 1,
        xp: 1,
        user: {
          name: '$user.name',
          username: '$user.username',
          avatar: '$user.avatar',
          region: '$user.region',
        },
      },
    },
  ]

  const rows = await Match.aggregate(pipeline)

  const leaderboard = rows.map((row, index) => {
    const wins = Number(row?.wins ?? 0)
    const losses = Number(row?.losses ?? 0)
    const xp = Number(row?.xp ?? 0)
    const winRate = computeWinRate(wins, losses)
    const user = row?.user || {}
    const username = user?.username ? String(user.username) : ''
    const name =
      (user?.name && String(user.name).trim()) ||
      (username && username.trim()) ||
      `Player ${String(row?._id).slice(0, 6)}`

    return {
      rank: index + 1,
      _id: String(row?._id),
      name,
      username,
      avatar: user?.avatar ? String(user.avatar) : '',
      region: user?.region ? String(user.region) : 'global',
      xp,
      winRate,
      stats: { wins, losses, xp },
    }
  })

  res.json({ leaderboard, type: 'rolling', windowDays: days })
}
