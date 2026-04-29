const stripTrailingSlash = (value) => value.replace(/\/$/, '');

export const getApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_URL;

  if (configuredBaseUrl) {
    return stripTrailingSlash(configuredBaseUrl);
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  return '/api';
};
