import { v4 as uuidv4 } from 'uuid'
import { socraticService } from '../services/socraticService.js'
import { jobService } from '../../job-service/services/jobService.js'
import { publishToQueue } from '../../../rabbitmq/publisher.js'
import { QUEUES } from '../../../rabbitmq/queues.js'

export const socraticController = {

  async startSession(req, res, next) {
    try {
      const { code, persona, context } = req.body
      const userId = req.userId

      if (!code || code.trim().length < 10) {
        return res.status(400).json({ error: 'Code is required (min 10 chars)' })
      }
      if (!['faang', 'startup', 'security'].includes(persona)) {
        return res.status(400).json({ error: 'Invalid persona' })
      }

      const result = await socraticService.startSession(
        userId, code, persona, context || null
      )
      
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async continueSession(req, res, next) {
    try {
      const { sessionId, userMessage, codeSnapshot } = req.body
      const userId = req.userId

      if (!sessionId || !userMessage) {
        return res.status(400).json({ error: 'sessionId and userMessage required' })
      }

      const result = await socraticService.continueSession(
        sessionId,
        userMessage,
        codeSnapshot || null
      )

      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async extendSession(req, res, next) {
    try {
      const { sessionId, additionalTurns } = req.body
      const result = await socraticService.extendSession(
        sessionId,
        req.userId,
        additionalTurns || 5
      )
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async getSession(req, res, next) {
    try {
      const result = await socraticService.getSession(
        req.params.sessionId,
        req.userId
      )
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
}

