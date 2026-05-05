import { historyService } from '../services/historyService.js';

export const historyController = {
  async getHistory(req, res) {
    try {
      const userId = req.userId;
      const history = await historyService.getReviewHistory(userId, 20);
      const countToday = await historyService.getReviewCountToday(userId);
      const totalCount = await historyService.getTotalCount(userId);

      res.json({
        message: 'Review history retrieved',
        history,
        totalCount,
        reviewsUsedToday: countToday,
      });
    } catch (error) {
      console.error('History controller error:', error.message);
      res.status(500).json({
        message: 'Failed to retrieve history',
        error: error.message,
      });
    }
  },

  async getReview(req, res) {
    try {
      const userId = req.userId;
      const { reviewId } = req.params;

      const review = await historyService.getReview(userId, reviewId);

      res.json({
        message: 'Review retrieved',
        review,
      });
    } catch (error) {
      console.error('Get review controller error:', error.message);
      res.status(404).json({
        message: 'Review not found',
        error: error.message,
      });
    }
  },

  async deleteReview(req, res) {
    try {
      const userId = req.userId;
      const { reviewId } = req.params;

      await historyService.deleteReview(userId, reviewId);

      res.json({
        message: 'Review deleted successfully',
      });
    } catch (error) {
      console.error('Delete review controller error:', error.message);
      res.status(404).json({
        message: 'Failed to delete review',
        error: error.message,
      });
    }
  },
};
