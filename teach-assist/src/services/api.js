import { getApiUrl, getAuthUrl, getHeaders } from '../config/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(url, options = {}) {
    const headers = getHeaders(this.token);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(credentials) {
    const response = await this.request(getAuthUrl('/login'), {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async logout() {
    this.setToken(null);
  }

  // API endpoints
  async getStandards() {
    return this.request(getApiUrl('/standards'));
  }

  async getDetailedStandards() {
    return this.request(getApiUrl('/detailedstandards'));
  }

  // Add other API methods as needed...
}

export default new ApiService(); 