import { socraticService } from '../services/socraticService.js';
import { validationResult } from 'express-validator';

export const socraticController = {
  async startSession(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId;
      const { code, persona, context } = req.body;

      console.log('Start session request:', { userId, persona, codeLength: code.length, contextSource: context?.source });

      const session = await socraticService.startSession(userId, code, persona, context || null);

      res.status(201).json({
        message: 'Socratic session started',
        session,
      });
    } catch (error) {
      console.error('Socratic controller error:', error.message);
      res.status(500).json({
        message: 'Failed to start Socratic session',
        error: error.message,
      });
    }
  },

  async continueSession(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId;
      const { sessionId, userMessage, codeSnapshot = null } = req.body;

      console.log('Continue session request:', { sessionId, userId });

      const session = await socraticService.continueSession(sessionId, userMessage, codeSnapshot);

      res.json({
        message: 'Session continued',
        session,
      });
    } catch (error) {
      console.error('Socratic controller error:', error.message);
      res.status(500).json({
        message: 'Failed to continue session',
        error: error.message,
      });
    }
  },

  async getSession(req, res, next) {
    try {
      const userId = req.userId;
      const { sessionId } = req.params;

      const session = await socraticService.getSession(sessionId, userId);

      res.json({
        session,
      });
    } catch (error) {
      console.error('Socratic controller error:', error.message);
      res.status(404).json({
        message: 'Session not found',
        error: error.message,
      });
    }
  },
};
