import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : '/api',
  withCredentials: true,   // send cookies (works in same-domain and cross-origin with SameSite=None)
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Token storage for cross-origin fallback ───────────────────────────────────
// When deployed on Vercel (frontend) ↔ Render (backend), HTTP-only cookies with
// SameSite=None need Secure=true. As an extra fallback we also store the JWT in
// memory and send it as Authorization: Bearer on every request.
// This handles edge cases where the browser blocks third-party cookies.
let _memoryToken = null;

export const setMemoryToken = (token) => { _memoryToken = token; };
export const clearMemoryToken = () => { _memoryToken = null; };

// ── Request interceptor — attach Bearer token if available ────────────────────
api.interceptors.request.use((config) => {
  if (_memoryToken) {
    config.headers['Authorization'] = `Bearer ${_memoryToken}`;
  }
  return config;
});

// ── Response interceptor — handle 401 globally ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearMemoryToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
