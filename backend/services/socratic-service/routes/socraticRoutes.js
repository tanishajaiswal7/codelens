import express from 'express'
import { socraticController } from '../controllers/socraticController.js'
import { authMiddleware } from '../../../middleware/authMiddleware.js'

const router = express.Router()

router.post('/start',                 authMiddleware, (req, res, next) => socraticController.startSession(req, res, next))
router.post('/reply',                 authMiddleware, (req, res, next) => socraticController.continueSession(req, res, next))
router.get('/session/:sessionId',     authMiddleware, (req, res, next) => socraticController.getSession(req, res, next))
router.post('/extend',                authMiddleware, (req, res, next) => socraticController.extendSession(req, res, next))

export default router
