import express from 'express'
import { authMiddleware } from '../../../middleware/authMiddleware.js'
import { Notification } from '../models/Notification.js'
import { WorkspaceMember } from '../../workspace-service/models/WorkspaceMember.js'

const router = express.Router()

// Get unread notifications for workspace
router.get('/:workspaceId', authMiddleware, async (req, res, next) => {
  try {
    const { workspaceId } = req.params

    // Verify membership exists
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.userId,
      isActive: true,
    })
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' })
    }

    let query = { workspaceId, isRead: false }

    // Members only see notifications targeted at them
    if (membership.role === 'member') {
      query.targetUserId = req.userId
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    res.json(notifications)
  } catch (err) {
    next(err)
  }
})

// Mark notification as read
router.patch('/:notificationId/read', authMiddleware, async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { isRead: true }
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router