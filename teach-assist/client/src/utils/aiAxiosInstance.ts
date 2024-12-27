import axios from 'axios';

const aiAxiosInstance = axios.create({
  baseURL: 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default aiAxiosInstance; 