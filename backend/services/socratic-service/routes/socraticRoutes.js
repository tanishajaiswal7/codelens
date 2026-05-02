import express from 'express'
import {
  startSession,
  replyToSession,
  getSession,
} from '../controllers/socraticController.js'
import { authMiddleware } from '../../../middleware/authMiddleware.js'

const router = express.Router()

router.post('/start',       authMiddleware, startSession)
router.post('/reply',       authMiddleware, replyToSession)
router.get('/session/:id',  authMiddleware, getSession)

export default router
