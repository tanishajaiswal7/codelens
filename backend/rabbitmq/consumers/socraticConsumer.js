import { getChannel } from '../connection.js'
import { QUEUES } from '../queues.js'
import { socraticService } from '../../services/socratic-service/services/socraticService.js'
import { jobService } from '../../services/job-service/services/jobService.js'

export async function startSocraticConsumer() {
  const channel = await getChannel()

  await channel.assertQueue(QUEUES.SOCRATIC_JOBS, { durable: true })
  channel.prefetch(1)

  console.log('[Consumer] Socratic consumer started')

  channel.consume(QUEUES.SOCRATIC_JOBS, async (msg) => {
    if (!msg) return

    let payload
    try {
      payload = JSON.parse(msg.content.toString())
    } catch {
      channel.nack(msg, false, false)
      return
    }

    const { jobId, userId, action } = payload
    console.log(`[Socratic Consumer] Processing job ${jobId}, action: ${action}`)

    try {
      await jobService.updateJob(jobId, 'processing', null, null)

      let result

      if (action === 'start') {
        result = await socraticService.startSession(
          userId,
          payload.code,
          payload.persona,
          payload.context || null
        )
      } else if (action === 'reply') {
        result = await socraticService.continueSession(
          payload.sessionId,
          payload.userMessage,
          payload.currentCode || null
        )
      } else {
        throw new Error(`Unknown socratic action: ${action}`)
      }

      await jobService.updateJob(jobId, 'done', result, null)
      channel.ack(msg)
      console.log(`[Socratic Consumer] Job ${jobId} completed`)

    } catch (error) {
      console.error(`[Socratic Consumer] Job ${jobId} failed:`, error.message)

      await jobService.updateJob(jobId, 'failed', null, error.message)

      // Transient errors (network/AI): requeue once
      const isTransient =
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('timeout') ||
        error.message?.includes('529') ||
        error.message?.includes('rate_limit')

      channel.nack(msg, false, isTransient && !msg.fields.redelivered)
    }
  })
}
