import axios from 'axios';

export const TOKEN_KEY = 'ttpro:token';
export const REFRESH_TOKEN_KEY = 'ttpro:refresh_token';
export const AUTH_TOKEN_UPDATED_EVENT = 'ttpro:auth:token';

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
  } catch {
    return null;
  }
}

function writeToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
    }
  } catch {
    // ignore storage errors
  }
}

function clearAllTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

function emitTokenUpdated(token) {
  try {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATED_EVENT, { detail: { token: token || null } }));
  } catch {
    // ignore event errors
  }
}

/**
 * Ensures requests hit .../api/leaderboard, not .../leaderboard.
 * Common mistake: VITE_API_URL=http://localhost:5001 (missing /api) → 404 on every route.
 */
function normalizeApiBaseUrl(raw) {
  const fallback = 'http://localhost:5001/api';
  const s = String(raw ?? '').trim();
  if (!s) return fallback;
  if (s.startsWith('/')) {
    const path = s.replace(/\/$/, '') || '/api';
    if (path === '/api' || path.startsWith('/api/')) return path;
    return '/api';
  }
  try {
    const u = new URL(s);
    const p = (u.pathname || '').replace(/\/$/, '') || '';
    if (p === '' || p === '/') {
      u.pathname = '/api';
    }
    return u.href.replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  withCredentials: true,
});

// Request interceptor - attach access token
API.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor - handle token expiry with queue system
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function shouldSkipRefresh(originalRequest) {
  const url = String(originalRequest?.url || '');
  return (
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/auth/signup')
  );
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return API(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });

        const { accessToken } = response.data;
        
        // Store new access token
        writeToken(accessToken);
        emitTokenUpdated(accessToken);
        
        // Update Authorization header
        API.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        
        // Process queued requests
        processQueue(null, accessToken);
        
        return API(originalRequest);
      } catch (refreshError) {
        console.error('[AUTH] Refresh failed:', refreshError);
        processQueue(refreshError, null);
        clearAllTokens();
        emitTokenUpdated(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        failedQueue = [];
      }
    }

    return Promise.reject(error);
  }
);

export default API;
