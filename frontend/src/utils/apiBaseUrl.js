const stripTrailingSlash = (value) => value.replace(/\/$/, '');

export const getApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_URL;
  const isDev = import.meta.env.DEV;

  if (configuredBaseUrl) {
    return stripTrailingSlash(configuredBaseUrl);
  }

  if (isDev) {
    return 'http://localhost:5000';
  }

  // Production fallback: Use relative path which will be proxied by Vercel
  // IMPORTANT: Set VITE_API_URL environment variable in Vercel settings
  // to point to your actual backend URL (e.g., https://api.codelens.app)
  if (import.meta.env.PROD) {
    console.warn(
      '[apiBaseUrl] VITE_API_URL not set in production. Using /api relative path. ' +
      'This will only work if backend is served from the same domain or a proxy is configured. ' +
      'Set VITE_API_URL environment variable for production deployments.'
    );
  }

  return '/api';
};
