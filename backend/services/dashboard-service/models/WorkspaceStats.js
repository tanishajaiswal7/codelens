import mongoose from 'mongoose'

const workspaceStatsSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    unique: true,
    index: true
  },
  totalReviews: { type: Number, default: 0 },
  lastReviewAt: { type: Date, default: null },
  lastReviewVerdict: { type: String, default: null },
  lastReviewCriticalCount: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
})

workspaceStatsSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export const WorkspaceStats = mongoose.model(
  'WorkspaceStats',
  workspaceStatsSchema
)