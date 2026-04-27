import express from 'express';
import { historyController } from '../controllers/historyController.js';
import { verifyToken } from '../../../middleware/authMiddleware.js';

const router = express.Router();

// All history routes require authentication
router.use(verifyToken);

// GET /api/history - Get last 20 reviews
router.get('/', historyController.getHistory);

// GET /api/history/:reviewId - Get full review
router.get('/:reviewId', historyController.getReview);

// DELETE /api/history/:reviewId - Soft delete review
router.delete('/:reviewId', historyController.deleteReview);

export default router;
