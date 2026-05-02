import express from 'express';
import { body } from 'express-validator';
import { reviewController } from '../controllers/reviewController.js';
import { verifyToken } from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/',
  verifyToken,
  [
    body('code').trim().notEmpty().withMessage('Code is required'),
    body('persona')
      .isIn(['faang', 'startup', 'security'])
      .withMessage('Valid persona is required'),
  ],
  reviewController.createReview
);

router.post(
  '/re-review',
  verifyToken,
  [
    body('oldCode').trim().notEmpty().withMessage('oldCode is required'),
    body('newCode').trim().notEmpty().withMessage('newCode is required'),
    body('previousSuggestions').optional({ nullable: true }).isArray().withMessage('previousSuggestions must be an array'),
    body('persona')
      .isIn(['faang', 'startup', 'security'])
      .withMessage('Valid persona is required'),
  ],
  reviewController.reReview
);

router.get('/', verifyToken, reviewController.getReviewsByUser);

router.get('/:reviewId', verifyToken, reviewController.getReviewById);

export default router;
