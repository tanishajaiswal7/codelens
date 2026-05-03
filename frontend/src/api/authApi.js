import axiosInstance from '../utils/axiosInstance.js';

export const authApi = {
  register: (data) => axiosInstance.post('/api/auth/register', data),
  login: (data) => axiosInstance.post('/api/auth/login', data),
  forgotPassword: (data) => axiosInstance.post('/api/auth/forgot-password', data),
  resetPassword: (token, data) => axiosInstance.post(`/api/auth/reset-password/${token}`, data),
  logout: () => axiosInstance.post('/api/auth/logout'),
  getMe: () => axiosInstance.get('/api/auth/me'),
  completeOnboarding: () => axiosInstance.patch('/api/auth/complete-onboarding'),
  updateProfile: (data) => axiosInstance.put('/api/auth/profile', data),
  updateAvatar: (formData) => axiosInstance.put('/api/auth/avatar', formData),
};
