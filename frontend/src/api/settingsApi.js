import axiosInstance from '../utils/axiosInstance.js';

export const settingsApi = {
  getSettings: () =>
    axiosInstance.get('/api/settings'),
  updateSettings: (settings) =>
    axiosInstance.put('/api/settings', settings),
};
