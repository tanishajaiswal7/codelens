import axiosInstance from '../utils/axiosInstance.js';

export const reviewApi = {
  submitReview: (code, persona, mode = 'standard') =>
    axiosInstance.post('/api/review', { code, persona, mode }).then((r) => r.data),
  reReview: (oldCode, newCode, previousSuggestions, persona) =>
    axiosInstance.post('/api/review/re-review', {
      oldCode,
      newCode,
      previousSuggestions,
      persona,
    }).then((r) => r.data),
  submitReReview: (originalCode, updatedCode, persona, originalSuggestions) =>
    reviewApi.reReview(originalCode, updatedCode, originalSuggestions, persona),
  getReviews: () => axiosInstance.get('/api/review').then((r) => r.data),
  getReviewById: (reviewId) => axiosInstance.get(`/api/review/${reviewId}`).then((r) => r.data),
};
