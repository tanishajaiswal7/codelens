import { getChannel } from '../../../rabbitmq/connection.js'
import { QUEUES, QUEUE_OPTIONS } from '../../../rabbitmq/queues.js'
import { publishEvent } from '../../../rabbitmq/publisher.js'
import { jobService } from '../../job-service/services/jobService.js'
import { socraticService } from '../services/socraticService.js'

export async function startSocraticConsumer() {
  const channel = getChannel()

  await channel.assertQueue(QUEUES.SOCRATIC_JOBS, QUEUE_OPTIONS)
  channel.prefetch(1)

  console.log('[Consumer] Socratic consumer started')

  channel.consume(QUEUES.SOCRATIC_JOBS, async (msg) => {
    if (!msg) return

    let payload
    try {
      payload = JSON.parse(msg.content.toString())
    } catch (err) {
      channel.nack(msg, false, false)
      return
    }

    await jobService.updateJob(payload.jobId, 'processing', null, null)

    try {
      let result

      if (payload.action === 'start') {
        result = await socraticService.startSession(
          payload.userId,
          payload.code,
          payload.persona,
          payload.context || null
        )

        // Publish history event for session start
        await publishEvent(QUEUES.HISTORY_EVENTS, {
          type: 'socratic_session_started',
          userId: payload.userId,
          sessionId: result.sessionId,
          persona: payload.persona,
          createdAt: new Date().toISOString()
        })

      } else if (payload.action === 'reply') {
        if (payload.codeSnapshot && payload.originalCode) {
          // code-aware reply triggered when developer edited code while responding
          result = await socraticService.continueSessionWithCode(
            payload.sessionId,
            payload.userMessage,
            payload.codeSnapshot,
            payload.originalCode,
          )
        } else {
          result = await socraticService.continueSession(
            payload.sessionId,
            payload.userMessage,
            payload.codeSnapshot || null
          )
        }

        // If session completed (10 turns reached)
        if (result.completed) {
          await publishEvent(QUEUES.HISTORY_EVENTS, {
            type: 'socratic_session_completed',
            userId: payload.userId,
            sessionId: payload.sessionId,
            turnCount: result.turnCount,
            createdAt: new Date().toISOString()
          })
        }
      }

      await jobService.updateJob(payload.jobId, 'done', result, null)
      channel.ack(msg)

    } catch (err) {
      console.error('[SocraticConsumer] Failed:', err.message)
      await jobService.updateJob(payload.jobId, 'failed', null, err.message)
      channel.nack(msg, false, false)
    }
  })
}