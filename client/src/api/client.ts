import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    config.timeout = 600000; // 10 min for file uploads
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    // Surface the server's error message so callers get the real reason
    const serverMsg = error.response?.data?.message;
    if (serverMsg && typeof serverMsg === 'string') {
      error.message = serverMsg;
    }
    return Promise.reject(error);
  },
);

export default apiClient;
