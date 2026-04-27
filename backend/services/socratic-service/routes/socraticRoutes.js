import express from 'express';
import { body } from 'express-validator';
import { socraticController } from '../controllers/socraticController.js';
import { verifyToken } from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/start',
  verifyToken,
  [
    body('code').trim().notEmpty().withMessage('Code is required'),
    body('persona')
      .isIn(['faang', 'startup', 'security'])
      .withMessage('Valid persona is required'),
  ],
  socraticController.startSession
);

router.post(
  '/reply',
  verifyToken,
  [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('userMessage').trim().notEmpty().withMessage('Message is required'),
    body('codeSnapshot').optional({ nullable: true }).isString().withMessage('codeSnapshot must be a string'),
  ],
  socraticController.continueSession
);

router.get('/session/:sessionId', verifyToken, socraticController.getSession);

export default router;
