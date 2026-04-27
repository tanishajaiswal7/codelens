import { historyService } from '../services/history-service/services/historyService.js';

const DAILY_LIMIT = 20;

export const rateLimiter = async (req, res, next) => {
  try {
    const userId = req.userId;

    // Only check on review submission endpoints.
    if (req.method === 'POST' && (req.path === '/api/review' || req.path === '/api/review/re-review')) {
      const reviewCount = await historyService.getReviewCountToday(userId);

      if (reviewCount >= DAILY_LIMIT) {
        return res.status(429).json({
          error: 'Daily limit reached',
          limit: DAILY_LIMIT,
          used: reviewCount,
        });
      }

      // Store remaining for response header
      res.locals.rateLimitRemaining = DAILY_LIMIT - reviewCount - 1; // -1 for the current request
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Don't block on rate limiter errors, just log
    next();
  }
};
