import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  type: {
    type: String,
    enum: ['critical_issues_found', 'pr_reviewed', 'member_joined', 'manager_decision'],
    required: true
  },
  message: { type: String, required: true },
  reviewId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

// Auto-delete after 30 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
)

export const Notification = mongoose.model('Notification', notificationSchema)