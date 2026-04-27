import { reviewService } from '../services/reviewService.js';
import { validationResult } from 'express-validator';
import { validateCode, validatePersona } from '../../../middleware/inputValidation.js';

export const reviewController = {
  async createReview(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.userId;
      const { code, persona, mode = 'standard' } = req.body;

      // Validate and sanitize inputs
      const sanitizedCode = validateCode(code);
      const validatedPersona = validatePersona(persona);

      console.log('Review request:', { userId, persona: validatedPersona, codeLength: code.length });

      const review = await reviewService.runReview(userId, sanitizedCode, validatedPersona);

      // Add rate limit header if available
      if (res.locals.rateLimitRemaining !== undefined) {
        res.setHeader('X-RateLimit-Remaining', res.locals.rateLimitRemaining);
      }

      res.status(201).json({
        message: 'Review completed successfully',
        review,
      });
    } catch (error) {
      console.error('Review controller error:', error.message);
      // Don't expose error stack in response
      res.status(400).json({
        error: error.message || 'Failed to process review',
      });
      next(error);
    }
  },

  async getReviewsByUser(req, res, next) {
    try {
      const userId = req.userId;
      const reviews = await reviewService.getReviewsByUserId(userId);
      res.json({ reviews });
    } catch (error) {
      next(error);
    }
  },

  async getReviewById(req, res, next) {
    try {
      const userId = req.userId;
      const { reviewId } = req.params;
      const review = await reviewService.getReviewById(reviewId, userId);

      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      res.json({ review });
    } catch (error) {
      next(error);
    }
  },
};
