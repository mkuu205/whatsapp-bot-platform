// web-platform/frontend/src/api/axios.js - UPDATED
import axios from 'axios';

// Set the base URL for ALL axios requests
const API_BASE_URL = process.env.REACT_APP_API_URL 
  || 'https://whatsapp-bot-platform-q8tv.onrender.com';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.timeout = 30000;

console.log('🔧 Axios configured with base URL:', API_BASE_URL);

// Add request interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axios;
