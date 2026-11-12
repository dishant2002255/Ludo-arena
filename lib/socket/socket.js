'use client';

import { io } from 'socket.io-client';

let socket = null;

/**
 * Get or create the Socket.IO singleton.
 * Pass the JWT token in auth.token so the backend socketAuth middleware
 * can authenticate the socket even when cookies are blocked cross-origin.
 */
export const getSocket = () => {
  if (!socket) {
    // Read token from Zustand persist storage for auth
    let token = null;
    try {
      const stored = localStorage.getItem('ludo-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed?.state?._token || null;
      }
    } catch {}

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token },   // sent to socketAuth middleware
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

/**
 * Update the auth token on the socket after login.
 * Call this after login/register so the socket uses the latest token.
 */
export const updateSocketAuth = (token) => {
  if (socket) {
    socket.auth = { token };
    // Reconnect to apply new auth
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }
  // Also recreate on next getSocket() call
  socket = null;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
};
