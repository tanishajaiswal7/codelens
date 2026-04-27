import axiosInstance from '../utils/axiosInstance.js';

export const reviewApi = {
  submitReview: (code, persona, mode = 'standard') =>
    axiosInstance.post('/api/review', { code, persona, mode }).then((r) => r.data),
  submitReReview: (originalCode, updatedCode, persona, originalSuggestions, parentReviewId) =>
    axiosInstance.post('/api/review/re-review', {
      originalCode,
      updatedCode,
      persona,
      originalSuggestions,
      parentReviewId,
    }).then((r) => r.data),
  getReviews: () => axiosInstance.get('/api/review').then((r) => r.data),
  getReviewById: (reviewId) => axiosInstance.get(`/api/review/${reviewId}`).then((r) => r.data),
};
