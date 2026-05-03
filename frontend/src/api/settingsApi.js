import axiosInstance from '../utils/axiosInstance.js';

export const settingsApi = {
  getSettings: async () => {
    try {
      const response = await axiosInstance.get('/api/settings');
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[settingsApi] Failed to fetch settings:', {
          status: error.response?.status,
          message: error.message,
        });
      }
      throw error;
    }
  },

  updateSettings: async (settings) => {
    try {
      const response = await axiosInstance.put('/api/settings', settings);
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[settingsApi] Failed to update settings:', {
          status: error.response?.status,
          message: error.message,
        });
      }
      throw error;
    }
  },
};
