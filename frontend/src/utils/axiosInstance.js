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
    const { response, request, message, config } = error;
    const isDev = process.env.NODE_ENV === 'development';

    // Log all errors in development for debugging
    if (isDev) {
      console.error('[axiosInstance] Error:', {
        status: response?.status,
        url: config?.url || request?.url || 'unknown',
        method: config?.method || 'unknown',
        message,
        data: response?.data,
      });
    }

    // 401 Unauthorized: Let the caller handle it (e.g., AuthContext)
    // Do NOT auto-redirect here, as it breaks React state management
    if (response?.status === 401) {
      if (isDev) {
        console.warn('[axiosInstance] Unauthorized (401) - let the caller decide what to do');
      }
      // Just reject, don't redirect
      return Promise.reject(error);
    }

    // 403 Forbidden: User is authenticated but doesn't have permission
    if (response?.status === 403) {
      if (isDev) {
        console.warn('[axiosInstance] Forbidden (403) - user lacks required permissions');
      }
      return Promise.reject(error);
    }

    // Handle network/connectivity errors
    if (!response && !request) {
      // Request setup error
      if (isDev) {
        console.error('[axiosInstance] Request setup failed:', message);
      }
    } else if (!response) {
      // Network error (no response from server)
      if (isDev) {
        console.error('[axiosInstance] Network unreachable:', {
          baseURL,
          message,
        });
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
