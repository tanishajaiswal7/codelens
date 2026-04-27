import { getChannel } from '../connection.js'
import { QUEUES, QUEUE_OPTIONS } from '../queues.js'

export async function startDashboardConsumer() {
  const channel = getChannel()

  await channel.assertQueue(QUEUES.DASHBOARD_EVENTS, QUEUE_OPTIONS)
  channel.prefetch(3)

  console.log('[Consumer] Dashboard consumer started')

  channel.consume(QUEUES.DASHBOARD_EVENTS, async (msg) => {
    if (!msg) return

    let event
    try {
      event = JSON.parse(msg.content.toString())
    } catch (err) {
      channel.nack(msg, false, false)
      return
    }

    try {
      console.log(`[DashboardConsumer] Event: ${event.type} workspace: ${event.workspaceId}`)

      if (event.type === 'workspace_review_completed') {
        // Import to avoid circular dependencies
        const { WorkspaceStats } = await import(
          '../../services/dashboard-service/models/WorkspaceStats.js'
        )

        // Upsert workspace stats cache
        // This is a cached summary so dashboard loads instantly
        // The full stats are computed fresh on demand
        // This just tracks a last-updated timestamp
        await WorkspaceStats.findOneAndUpdate(
          { workspaceId: event.workspaceId },
          {
            workspaceId: event.workspaceId,
            lastReviewAt: new Date(),
            lastReviewVerdict: event.verdict,
            lastReviewCriticalCount: event.criticalCount,
            $inc: { totalReviews: 1 }
          },
          { upsert: true, new: true }
        )

        console.log(`[DashboardConsumer] Stats updated for workspace: ${event.workspaceId}`)
      }

      channel.ack(msg)

    } catch (err) {
      console.error('[DashboardConsumer] Failed:', err.message)
      // Ack anyway — stats update failure should not block anything
      channel.ack(msg)
    }
  })
}