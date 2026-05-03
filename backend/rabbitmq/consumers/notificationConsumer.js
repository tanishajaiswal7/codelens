import { getChannel } from '../connection.js'
import { QUEUES, QUEUE_OPTIONS } from '../queues.js'

export async function startNotificationConsumer() {
  const channel = getChannel()

  await channel.assertQueue(QUEUES.NOTIFICATION_EVENTS, QUEUE_OPTIONS)
  channel.prefetch(5)

  console.log('[Consumer] Notification consumer started')

  channel.consume(QUEUES.NOTIFICATION_EVENTS, async (msg) => {
    if (!msg) return

    let event
    try {
      event = JSON.parse(msg.content.toString())
    } catch (err) {
      channel.nack(msg, false, false)
      return
    }

    try {
      const { Notification } = await import(
        '../../services/notification-service/models/Notification.js'
      )

      if (event.type === 'critical_issues_found') {
        console.log(
          `[NotificationConsumer] CRITICAL ISSUES in workspace ${event.workspaceId}:`,
          `${event.criticalCount} critical issues found`,
          event.prNumber ? `in PR #${event.prNumber}` : ''
        )

        await Notification.create({
          workspaceId: event.workspaceId,
          type: 'critical_issues_found',
          message: `${event.criticalCount} critical issue(s) found${event.prNumber ? ` in PR #${event.prNumber}` : ''}`,
          reviewId: event.reviewId,
          isRead: false,
          createdAt: new Date()
        })
      }

      if (event.type === 'pr_reviewed') {
        await Notification.create({
          workspaceId: event.workspaceId,
          type: 'pr_reviewed',
          message: `PR #${event.prNumber} reviewed (${event.verdict || 'completed'})${event.criticalCount > 0 ? `, ${event.criticalCount} critical` : ''}`,
          reviewId: event.reviewId,
          isRead: false,
          createdAt: new Date()
        })
      }

      if (event.type === 'member_joined') {
        await Notification.create({
          workspaceId: event.workspaceId,
          type: 'member_joined',
          message: `${event.joinedUserName || 'A member'} joined${event.workspaceName ? ` ${event.workspaceName}` : ' the workspace'}`,
          reviewId: null,
          isRead: false,
          createdAt: new Date()
        })
      }

      if (event.type === 'manager_decision') {
        // Create notification for the target user about manager decision
        await Notification.create({
          workspaceId: event.workspaceId,
          type: 'manager_decision',
          message: `Your review was ${event.decision}${event.prNumber ? ` for PR #${event.prNumber}` : ''}`,
          reviewId: event.reviewId || null,
          targetUserId: event.targetUserId || null,
          isRead: false,
          createdAt: new Date()
        })

        // Attempt to send email notification if configured
        try {
          const { emailService } = await import(
            '../../services/notification-service/services/emailService.js'
          )

          // Look up user email if targetUserId provided
          if (event.targetUserId) {
            const { User } = await import('../../services/auth-service/models/User.js')
            const user = await User.findById(event.targetUserId).select('email name').lean()
            if (user && user.email) {
              await emailService.sendPRDecisionEmail({
                toEmail: user.email,
                toName: user.name || user.email,
                decision: event.decision,
                feedback: event.feedback || null,
                prNumber: event.prNumber || null,
                workspaceId: event.workspaceId,
                repoFullName: event.repoFullName || null,
              })
            }
          }
        } catch (e) {
          // Non-fatal
          console.warn('[NotificationConsumer] manager_decision email failed:', e.message || e)
        }
      }

      if (event.type === 'send_invite_email') {
        const { emailService } = await import(
          '../../services/notification-service/services/emailService.js'
        )

        const sent = await emailService.sendWorkspaceInviteEmail({
          toEmail: event.toEmail,
          workspaceName: event.workspaceName,
          inviteUrl: event.inviteUrl,
        })

        if (!sent) {
          throw new Error(`Invite email failed for ${event.toEmail}`)
        }
      }

      channel.ack(msg)

    } catch (err) {
      console.error('[NotificationConsumer] Failed:', err.message)
      channel.nack(msg, false, false)
    }
  })
}