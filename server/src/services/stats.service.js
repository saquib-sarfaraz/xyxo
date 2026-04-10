import mongoose from 'mongoose'
import { User } from '../models/User.model.js'
import { Match } from '../models/Match.model.js'

const XP_WIN = 25
const XP_LOSS = 5
const XP_DRAW = 10

function updateStreak(user, result) {
  const current = user.stats?.currentStreak || 0
  const best = user.stats?.bestStreak || 0
  if (result === 'win') {
    return {
      currentStreak: current + 1,
      bestStreak: Math.max(best, current + 1),
    }
  }
  return { currentStreak: 0, bestStreak: best }
}

async function applyWinUpdate({ winnerId, loserId, session }) {
  const options = session ? { session } : undefined
  const winner = await User.findById(winnerId, null, options)
  const streakUpdate = winner ? updateStreak(winner, 'win') : {}

  await Promise.all([
    User.findByIdAndUpdate(
      winnerId,
      {
        $inc: { 'stats.wins': 1, 'stats.xp': XP_WIN },
        $set: { 'stats.lastResult': 'win', ...streakUpdate },
      },
      options,
    ),
    User.findByIdAndUpdate(
      loserId,
      {
        $inc: { 'stats.losses': 1, 'stats.xp': XP_LOSS },
        $set: { 'stats.lastResult': 'loss', 'stats.currentStreak': 0 },
      },
      options,
    ),
    Match.create(
      [
        {
          players: [winnerId, loserId],
          winner: winnerId,
          loser: loserId,
          result: 'X',
          finishedAt: new Date(),
          xpWinner: XP_WIN,
          xpLoser: XP_LOSS,
        },
      ],
      options,
    ),
  ])
}

async function applyDrawUpdate({ player1Id, player2Id, session }) {
  const options = session ? { session } : undefined

  await Promise.all([
    User.findByIdAndUpdate(
      player1Id,
      {
        $inc: { 'stats.draws': 1, 'stats.xp': XP_DRAW },
        $set: { 'stats.lastResult': 'draw' },
      },
      options,
    ),
    User.findByIdAndUpdate(
      player2Id,
      {
        $inc: { 'stats.draws': 1, 'stats.xp': XP_DRAW },
        $set: { 'stats.lastResult': 'draw' },
      },
      options,
    ),
    Match.create(
      [
        {
          players: [player1Id, player2Id],
          result: 'draw',
          finishedAt: new Date(),
          xpDraw: XP_DRAW,
        },
      ],
      options,
    ),
  ])
}

async function executeInTransaction(fn) {
  let session = null
  try {
    session = await mongoose.startSession()
    await session.withTransaction(async () => {
      await fn(session)
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const lower = message.toLowerCase()
    const txnUnsupported =
      lower.includes('transaction numbers are only allowed') ||
      lower.includes('replica set') ||
      lower.includes('mongos') ||
      lower.includes('does not support transactions') ||
      (lower.includes('transaction') && lower.includes('replica'))
    if (txnUnsupported) {
      await fn(null)
    } else {
      throw err
    }
  } finally {
    try {
      session?.endSession()
    } catch {
      // ignore
    }
  }
}

/**
 * Persist match outcome. Rank is never stored — leaderboard is computed on read.
 * @param {string|mongoose.Types.ObjectId} winnerId
 * @param {string|mongoose.Types.ObjectId} loserId
 */
export async function updateStats(winnerId, loserId) {
  const w = winnerId != null ? String(winnerId).trim() : ''
  const l = loserId != null ? String(loserId).trim() : ''
  if (!w || !l || w === l) {
    throw new Error('updateStats requires distinct winnerId and loserId')
  }
  if (!mongoose.isValidObjectId(w) || !mongoose.isValidObjectId(l)) {
    throw new Error('updateStats requires valid ObjectIds')
  }

  await executeInTransaction(async (session) => {
    await applyWinUpdate({ winnerId: w, loserId: l, session })
  })
}

/**
 * Persist draw outcome.
 * @param {string|mongoose.Types.ObjectId} player1Id
 * @param {string|mongoose.Types.ObjectId} player2Id
 */
export async function updateDrawStats(player1Id, player2Id) {
  const p1 = player1Id != null ? String(player1Id).trim() : ''
  const p2 = player2Id != null ? String(player2Id).trim() : ''
  if (!p1 || !p2 || p1 === p2) {
    throw new Error('updateDrawStats requires distinct player IDs')
  }
  if (!mongoose.isValidObjectId(p1) || !mongoose.isValidObjectId(p2)) {
    throw new Error('updateDrawStats requires valid ObjectIds')
  }

  await executeInTransaction(async (session) => {
    await applyDrawUpdate({ player1Id: p1, player2Id: p2, session })
  })
}
