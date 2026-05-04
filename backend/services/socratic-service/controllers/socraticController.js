import { v4 as uuidv4 } from 'uuid'
import { socraticService } from '../services/socraticService.js'
import { jobService } from '../../job-service/services/jobService.js'
import { publishToQueue } from '../../../rabbitmq/publisher.js'
import { QUEUES } from '../../../rabbitmq/queues.js'

export const startSession = async (req, res, next) => {
  try {
    const { code, persona, context } = req.body

    if (!code || code.trim().length < 10) {
      return res.status(400).json({
        error: 'Code is required (minimum 10 characters)'
      })
    }

    if (!persona || !['faang', 'startup', 'security'].includes(persona)) {
      return res.status(400).json({
        error: 'Invalid persona. Must be faang, startup, or security'
      })
    }

    const jobId = uuidv4()
    await jobService.createJob(jobId, req.userId, 'socratic_start')

    await publishToQueue(QUEUES.SOCRATIC_JOBS, {
      jobId,
      userId: req.userId,
      timestamp: new Date().toISOString(),
      action: 'start',
      code,
      persona,
      context: context || null,
    })

    res.status(202).json({
      jobId,
      status: 'queued',
      pollUrl: `/api/jobs/${jobId}`,
    })
  } catch (error) {
    next(error)
  }
}

export const replyToSession = async (req, res, next) => {
  try {
    const { sessionId, userMessage, currentCode, codeSnapshot, originalCode } = req.body

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' })
    }
    if (!userMessage || userMessage.trim().length === 0) {
      return res.status(400).json({ error: 'userMessage is required' })
    }

    const jobId = uuidv4()
    await jobService.createJob(jobId, req.userId, 'socratic_reply')

    await publishToQueue(QUEUES.SOCRATIC_JOBS, {
      jobId,
      userId: req.userId,
      timestamp: new Date().toISOString(),
      action: 'reply',
      sessionId,
      userMessage,
      // prefer explicit codeSnapshot/originalCode when present
      codeSnapshot: codeSnapshot || currentCode || null,
      originalCode: originalCode || null,
    })

    res.status(202).json({
      jobId,
      status: 'queued',
      pollUrl: `/api/jobs/${jobId}`,
    })
  } catch (error) {
    next(error)
  }
}

export const getSession = async (req, res, next) => {
  try {
    const { id } = req.params
    const session = await socraticService.getSession(id, req.userId)
    res.json(session)
  } catch (error) {
    next(error)
  }
}
