import axiosInstance from '../utils/axiosInstance.js';

export const settingsApi = {
  getSettings: () =>
    axiosInstance.get('/api/settings').then((r) => r.data),
  updateSettings: (settings) =>
    axiosInstance.put('/api/settings', settings).then((r) => r.data),
};
