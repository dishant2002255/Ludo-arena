'use client';
import { useEffect, useRef } from 'react';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';

export default function AuthProvider({ children }) {
  const { refreshUser, logout, isAuthenticated, updateBalance, user } = useAuthStore();
  const socketRef = useRef(null);

  // On mount: verify session cookie is still valid
  useEffect(() => {
    refreshUser();

    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Connect socket only when authenticated; tear down on logout
  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      // Disconnect if previously connected
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Import socket lazily to avoid SSR issues
    let cleanup = () => {};
    (async () => {
      try {
        const { connectSocket } = await import('@/lib/socket/socket');
        const socket = connectSocket();
        socketRef.current = socket;

        const handleWalletUpdate = ({ newBalance, amount }) => {
          updateBalance(newBalance);
          if (amount > 0) {
            toast.success(`+${amount.toLocaleString()} coins credited to your wallet!`);
          }
        };

        const handleNotification = (notif) => {
          if (!notif?.title && !notif?.message) return;
          const typeToVariant = {
            coin_request_approved: 'success',
            coin_request_rejected: 'error',
            match_won: 'success',
            match_result: 'info',
            announcement: 'info',
          };
          const variant = typeToVariant[notif.type] || 'info';
          const message = notif.message || notif.title;
          if (toast[variant]) {
            toast[variant](message);
          } else {
            toast.info(message);
          }
        };

        socket.on('wallet:updated', handleWalletUpdate);
        socket.on('notification:new', handleNotification);

        cleanup = () => {
          socket.off('wallet:updated', handleWalletUpdate);
          socket.off('notification:new', handleNotification);
        };
      } catch (err) {
        // Socket connection failure should not crash the app
        console.warn('Socket connection failed:', err?.message);
      }
    })();

    return () => cleanup();
  }, [isAuthenticated, user?._id]);

  return children;
}
