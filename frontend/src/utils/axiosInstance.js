import axios from 'axios';
import { getApiBaseUrl } from './apiBaseUrl.js';

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Unauthorized access - redirecting to login');
      }
      window.location.href = '/login';
    }

    // Log network errors in development
    if (process.env.NODE_ENV === 'development' && !error.response) {
      console.error('Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
