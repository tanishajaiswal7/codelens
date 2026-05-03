import axios from 'axios';
import { getApiBaseUrl } from './apiBaseUrl.js';

const baseURL = getApiBaseUrl();

// Log the API base URL in development and production (hidden errors)
if (process.env.NODE_ENV === 'development') {
  console.log('[axiosInstance] Using API base URL:', baseURL);
}

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000, // 30 second timeout for all requests
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, request, message } = error;
    const isDev = process.env.NODE_ENV === 'development';

    // Log all errors in development for debugging
    if (isDev) {
      console.error('[axiosInstance] Error Details:', {
        status: response?.status,
        url: request?.url || 'unknown',
        message,
        data: response?.data,
      });
    }

    // Handle 401 Unauthorized
    if (response?.status === 401) {
      if (isDev) {
        console.warn('Unauthorized access - redirecting to login');
      }
      window.location.href = '/login';
    }

    // Handle network/connectivity errors
    if (!response && !request) {
      // Request setup error
      console.error('[axiosInstance] Request setup failed:', message);
    } else if (!response) {
      // Network error (no response from server)
      if (isDev) {
        console.error('[axiosInstance] Network error - backend may be unreachable:', {
          baseURL,
          message,
        });
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
