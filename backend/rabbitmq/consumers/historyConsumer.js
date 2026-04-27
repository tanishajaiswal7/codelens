import { getChannel } from '../connection.js'
import { QUEUES, QUEUE_OPTIONS } from '../queues.js'

export async function startHistoryConsumer() {
  const channel = getChannel()

  await channel.assertQueue(QUEUES.HISTORY_EVENTS, QUEUE_OPTIONS)
  channel.prefetch(5)
  // History can process 5 at a time — it is fast (just DB writes)

  console.log('[Consumer] History consumer started')

  channel.consume(QUEUES.HISTORY_EVENTS, async (msg) => {
    if (!msg) return

    let event
    try {
      event = JSON.parse(msg.content.toString())
    } catch (err) {
      channel.nack(msg, false, false)
      return
    }

    try {
      console.log(`[HistoryConsumer] Event: ${event.type}`)

      // Import history service here to avoid circular imports
      const { historyService } = await import(
        '../../services/history-service/services/historyService.js'
      )

      if (event.type === 'review_completed') {
        // Review is already saved to MongoDB by reviewService
        // This just ensures the history sidebar data is correct
        // History service reads from Review collection directly
        // So no extra save needed — just log for debugging
        console.log(
          `[HistoryService] Review recorded: ${event.reviewId} for user: ${event.userId}`
        )
      }

      else if (event.type === 'socratic_session_started') {
        await historyService.recordSocraticStart({
          userId: event.userId,
          sessionId: event.sessionId,
          persona: event.persona
        })
      }

      else if (event.type === 'socratic_session_completed') {
        await historyService.recordSocraticComplete({
          userId: event.userId,
          sessionId: event.sessionId,
          turnCount: event.turnCount
        })
      }

      // Always ack history events
      // If history saving fails, log it but do not block the user
      channel.ack(msg)

    } catch (err) {
      console.error('[HistoryConsumer] Failed to save history:', err.message)
      // Ack anyway — history failure should not affect user experience
      channel.ack(msg)
    }
  })
}