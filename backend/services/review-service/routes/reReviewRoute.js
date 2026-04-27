import express from 'express';
import { reReviewController } from '../controllers/reReviewController.js';
import { authMiddleware } from '../../../middleware/authMiddleware.js';
import { rateLimiter } from '../../../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', authMiddleware, rateLimiter, reReviewController.reReview);

export default router;
