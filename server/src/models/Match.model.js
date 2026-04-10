import mongoose from 'mongoose'

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60

const matchSchema = new mongoose.Schema(
  {
    players: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: 'Match.players must contain exactly 2 user ids',
      },
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    loser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    result: { type: String, enum: ['X', 'O', 'draw'], default: null },
    finishedAt: { type: Date, default: null },
    xpWinner: { type: Number, default: 25, min: 0 },
    xpLoser: { type: Number, default: 5, min: 0 },
    xpDraw: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true },
)

// TTL index to keep only the rolling 7-day window (MongoDB will auto-delete older docs).
matchSchema.index({ createdAt: 1 }, { expireAfterSeconds: SEVEN_DAYS_SECONDS })

export const Match = mongoose.models.Match || mongoose.model('Match', matchSchema)

