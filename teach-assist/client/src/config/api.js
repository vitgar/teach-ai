// API configuration
const config = {
  apiUrl: process.env.REACT_APP_API_URL,
  authUrl: process.env.REACT_APP_AUTH_URL,
  aiUrl: process.env.REACT_APP_AI_URL,
};

// Helper functions to construct API URLs
export const getApiUrl = (path) => `${config.apiUrl}${path}`;
export const getAuthUrl = (path) => `${config.authUrl}${path}`;
export const getAiUrl = (path) => `${config.aiUrl}${path}`;

// Helper function to construct headers
export const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
}); 