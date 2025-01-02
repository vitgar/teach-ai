import axios from 'axios';

const aiAxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_AI_URL || 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default aiAxiosInstance; 