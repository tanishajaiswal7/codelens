import axiosInstance from '../utils/axiosInstance.js';

export const historyApi = {
  getHistory: (params = {}) => axiosInstance.get('/api/history', { params }).then((r) => r.data),
  getReview: (reviewId) =>
    axiosInstance.get(`/api/history/${reviewId}`).then((r) => r.data),
  deleteReview: (reviewId) =>
    axiosInstance.delete(`/api/history/${reviewId}`).then((r) => r.data),
};
