import { getChannel } from './connection.js'
import { QUEUE_OPTIONS, MESSAGE_OPTIONS } from './queues.js'

export async function publishToQueue(queueName, payload) {
  try {
    const channel = getChannel()

    // Assert queue exists — safe to call multiple times
    await channel.assertQueue(queueName, QUEUE_OPTIONS)

    // Add standard fields to every message
    const message = {
      ...payload,
      _publishedAt: new Date().toISOString(),
      _queue: queueName
    }

    channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(message)),
      MESSAGE_OPTIONS
    )

    console.log(`[MQ] Published → ${queueName} | jobId: ${payload.jobId || payload.eventId || 'N/A'}`)
    return true
  } catch (err) {
    console.error(`[MQ] Failed to publish to ${queueName}:`, err.message)
    throw err
  }
}

// Helper for publishing events (fire and forget — no jobId needed)
export async function publishEvent(queueName, eventData) {
  return publishToQueue(queueName, {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...eventData
  })
}