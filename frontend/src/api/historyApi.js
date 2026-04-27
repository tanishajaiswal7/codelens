import axiosInstance from '../utils/axiosInstance.js';

export const historyApi = {
  getHistory: () =>
    axiosInstance.get('/api/history'),
  getReview: (reviewId) =>
    axiosInstance.get(`/api/history/${reviewId}`),
  deleteReview: (reviewId) =>
    axiosInstance.delete(`/api/history/${reviewId}`),
};
