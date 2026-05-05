import { Review } from '../../review-service/models/Review.js';

/**
 * History service
 * Manages retrieval and deletion of user code reviews
 */
export const historyService = {
  /**
   * Get review history for a user
   * @param {string} userId - User ID to fetch history for
   * @param {number} limit - Maximum number of reviews to return (default: 20)
   * @returns {Promise<Array>} Array of review history items
   */
  async getReviewHistory(userId, limit = 20, search = '') {
    try {
      const baseQuery = {
        userId,
        $or: [
          { source: { $in: ['paste', 'github_file'] } },
          { source: 'github_pr' }
        ],
        deleted: { $ne: true },
      };

      let finalQuery = baseQuery;

      if (search && search.length > 0) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        finalQuery = {
          ...baseQuery,
          $and: [
            {
              $or: [
                { code: regex },
                { summary: regex },
                { 'suggestions.title': regex },
                { 'suggestions.description': regex },
              ],
            },
          ],
        };
      }

      const reviews = await Review.find(finalQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id code persona mode verdict suggestions createdAt summary');

      return reviews.map((review) => ({
        reviewId: review._id,
        codeSnippet: (review.code || '').substring(0, 60) + ((review.code || '').length > 60 ? '...' : ''),
        persona: review.persona,
        mode: review.mode,
        verdict: review.verdict,
        summary: review.summary || '',
        // searchable text for client-side filtering (fallback)
        searchText: (
          (review.code || '') + ' ' +
          (review.summary || '') + ' ' +
          (Array.isArray(review.suggestions) ? review.suggestions.map(s => s.title || s.description || '').join(' ') : '')
        ).toLowerCase(),
        createdAt: review.createdAt,
      }));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('History service error:', error);
      }
      throw error;
    }
  },

  async getFilteredCount(userId, search = '') {
    try {
      const baseQuery = {
        userId,
        $or: [
          { source: { $in: ['paste', 'github_file'] } },
          { source: 'github_pr' }
        ],
        deleted: { $ne: true },
      };

      if (!search) {
        return await Review.countDocuments(baseQuery);
      }

      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const queryWithSearch = {
        ...baseQuery,
        $and: [
          {
            $or: [
              { code: regex },
              { summary: regex },
              { 'suggestions.title': regex },
              { 'suggestions.description': regex },
            ],
          },
        ],
      };

      return await Review.countDocuments(queryWithSearch);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Get filtered count error:', error);
      }
      throw error;
    }
  },

  /**
   * Get a single review by ID
   * @param {string} userId - User ID for authorization
   * @param {string} reviewId - Review ID to fetch
   * @returns {Promise<Object>} Full review document
   * @throws {Error} If review not found
   */
  async getReview(userId, reviewId) {
    try {
      const review = await Review.findOne({ _id: reviewId, userId, deleted: { $ne: true } });

      if (!review) {
        throw new Error('Review not found');
      }

      return {
        reviewId: review._id,
        code: review.code,
        persona: review.persona,
        mode: review.mode,
        summary: review.summary,
        verdict: review.verdict,
        suggestions: review.suggestions,
        createdAt: review.createdAt,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Get review error:', error);
      }
      throw error;
    }
  },

  /**
   * Soft delete a review (marks as deleted without removing)
   * @param {string} userId - User ID for authorization
   * @param {string} reviewId - Review ID to delete
   * @returns {Promise<Object>} Confirmation message
   * @throws {Error} If review not found
   */
  async deleteReview(userId, reviewId) {
    try {
      const review = await Review.findOneAndUpdate(
        { _id: reviewId, userId },
        { deleted: true },
        { new: true }
      );

      if (!review) {
        throw new Error('Review not found');
      }

      return { message: 'Review deleted' };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Delete review error:', error);
      }
      throw error;
    }
  },

  /**
   * Count reviews submitted by user today
   * Resets at 00:00 UTC every day
   * @param {string} userId - User ID to count reviews for
   * @returns {Promise<number>} Number of reviews submitted today
   */
  async getReviewCountToday(userId) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const count = await Review.countDocuments({
        userId,
        createdAt: { $gte: startOfDay },
        deleted: { $ne: true },
      });

      return count;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Get review count error:', error);
      }
      throw error;
    }
  },

  async getTotalCount(userId) {
    try {
      const count = await Review.countDocuments({ userId, deleted: { $ne: true } });
      return count;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Get total review count error:', error);
      }
      throw error;
    }
  },

  async recordReviewActivity({ userId, reviewId, workspaceId,
    persona, verdict, suggestionCount, createdAt }) {
    // Review is already saved to MongoDB by reviewService
    // This just ensures the history sidebar data is correct
    // History service reads from Review collection directly
    // So no extra save needed — just log for debugging
    console.log(
      `[HistoryService] Review recorded: ${reviewId} for user: ${userId}`
    )
  },

  async recordSocraticStart({ userId, sessionId, persona }) {
    console.log(
      `[HistoryService] Socratic session started: ${sessionId} for user: ${userId}`
    )
  },

  async recordSocraticComplete({ userId, sessionId, turnCount }) {
    console.log(
      `[HistoryService] Socratic session completed: ${sessionId} turns: ${turnCount}`
    )
  }
};
