import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development'
    ? '/api/v1'
    : (process.env.REACT_APP_API_URL || '/api/v1'),
  timeout: 30000,
});

// Request interceptor – attach token
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('swarnandrian-auth');
  if (raw) {
    try {
      const { state } = JSON.parse(raw);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {}
  }
  return config;
});

// Response interceptor – handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const requestUrl = err.config?.url || '';
      const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
      const hasToken = !!localStorage.getItem('swarnandrian-auth');

      if (isAuthEndpoint || !hasToken) {
        return Promise.reject(err);
      }

      localStorage.removeItem('swarnandrian-auth');
      delete api.defaults.headers.common.Authorization;

      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
