import axiosInstance from '../utils/axiosInstance.js';

export const historyApi = {
  getHistory: () =>
    axiosInstance.get('/api/history').then((r) => r.data),
  getReview: (reviewId) =>
    axiosInstance.get(`/api/history/${reviewId}`).then((r) => r.data),
  deleteReview: (reviewId) =>
    axiosInstance.delete(`/api/history/${reviewId}`).then((r) => r.data),
};
