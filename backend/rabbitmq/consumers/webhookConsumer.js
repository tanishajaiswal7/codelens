import { getChannel } from '../connection.js'
import { QUEUES, QUEUE_OPTIONS } from '../queues.js'

export async function startWebhookConsumer() {
  const channel = getChannel()

  await channel.assertQueue(QUEUES.WEBHOOK_JOBS, QUEUE_OPTIONS)
  channel.prefetch(2)

  console.log('[Consumer] Webhook consumer started')

  channel.consume(QUEUES.WEBHOOK_JOBS, async (msg) => {
    if (!msg) return

    let event
    try {
      event = JSON.parse(msg.content.toString())
    } catch (err) {
      channel.nack(msg, false, false)
      return
    }

    try {
      if (event.type === 'post_github_comment') {
        const { webhookService } = await import(
          '../../services/webhook-service/services/webhookService.js'
        )

        await webhookService.postReviewComment(
          event.installationId,
          event.repoFullName,
          event.prNumber,
          event.reviewResult
        )

        console.log(
          `[WebhookConsumer] Comment posted on PR #${event.prNumber}`
        )
      }

      channel.ack(msg)

    } catch (err) {
      console.error('[WebhookConsumer] Failed to post comment:', err.message)
      // Retry once for comment posting failures
      channel.nack(msg, false, true)
    }
  })
}