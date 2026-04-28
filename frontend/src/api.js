import axios from 'axios';

// Locally: Vite proxy forwards /api → localhost:8000 (works as before)
// On Vercel: reads VITE_API_URL env var to reach your Render backend
const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.trim().replace(/\/$/, '')
  : '';

const api = axios.create({
  baseURL: BASE ? `${BASE}/api` : '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;