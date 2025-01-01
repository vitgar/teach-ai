// src/utils/axiosInstance.js

import axios from "axios";

//API URL
const apiAxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_AUTH_URL?.replace('/auth', '') || 'http://localhost:5000',
  withCredentials: true
});

//AI URL
export const aiAxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_AI_URL || "http://localhost:5001",
});

// Add a request interceptor
apiAxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiAxiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default apiAxiosInstance;
