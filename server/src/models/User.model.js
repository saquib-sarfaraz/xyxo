import mongoose from 'mongoose'

const statsSchema = new mongoose.Schema(
  {
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    draws: { type: Number, default: 0, min: 0 },
    xp: { type: Number, default: 0, min: 0 },
    currentStreak: { type: Number, default: 0, min: 0 },
    bestStreak: { type: Number, default: 0, min: 0 },
    lastResult: { type: String, enum: ['win', 'loss', 'draw', null], default: null },
  },
  { _id: false },
)

statsSchema.virtual('totalGames').get(function () {
  return (this.wins || 0) + (this.losses || 0) + (this.draws || 0)
})

statsSchema.virtual('winRate').get(function () {
  const total = (this.wins || 0) + (this.losses || 0) + (this.draws || 0)
  if (total <= 0) return 0
  return Math.round(((this.wins || 0) / total) * 100)
})

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    username: { type: String, trim: true, sparse: true, index: true },
    avatar: { type: String, trim: true, default: '' },
    region: { type: String, trim: true, default: 'global', index: true },
    stats: { type: statsSchema, default: () => ({}) },
    friends: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: true },
)

userSchema.index({ 'stats.xp': -1 })
userSchema.index({ friends: 1 })

export const User = mongoose.models.User || mongoose.model('User', userSchema)
