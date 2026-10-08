import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
