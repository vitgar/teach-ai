const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  authUrl: process.env.REACT_APP_AUTH_URL || 'http://localhost:5000/auth',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
};

export const getApiUrl = (endpoint) => `${config.apiUrl}${endpoint}`;
export const getAuthUrl = (endpoint) => `${config.authUrl}${endpoint}`;

export const getHeaders = (token) => ({
  ...config.headers,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export default config; 