import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api, { setMemoryToken, clearMemoryToken } from '@/lib/api/axios';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      _token: null, // persisted JWT for cross-origin Bearer fallback

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const token = data.data?.token || null;
          if (token) {
            setMemoryToken(token);
            // Update socket auth dynamically
            if (typeof window !== 'undefined') {
              const { updateSocketAuth } = await import('@/lib/socket/socket');
              updateSocketAuth(token);
            }
          }
          set({ user: data.data.user, isAuthenticated: true, isLoading: false, _token: token });
          return { success: true, user: data.data.user };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.message || 'Login failed' };
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { username, email, password });
          const token = data.data?.token || null;
          if (token) {
            setMemoryToken(token);
            if (typeof window !== 'undefined') {
              const { updateSocketAuth } = await import('@/lib/socket/socket');
              updateSocketAuth(token);
            }
          }
          set({ user: data.data.user, isAuthenticated: true, isLoading: false, _token: token });
          return { success: true, user: data.data.user };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.message || 'Registration failed' };
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {}
        clearMemoryToken();
        if (typeof window !== 'undefined') {
          const { disconnectSocket } = await import('@/lib/socket/socket');
          disconnectSocket();
        }
        set({ user: null, isAuthenticated: false, _token: null });
      },

      refreshUser: async () => {
        // On page load, rehydrate the memory token from persisted store
        const { _token } = get();
        if (_token) setMemoryToken(_token);
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data.user, isAuthenticated: true });
        } catch {
          clearMemoryToken();
          set({ user: null, isAuthenticated: false, _token: null });
        }
      },

      updateBalance: (newBalance) =>
        set((state) => ({
          user: state.user ? { ...state.user, walletBalance: newBalance } : null,
        })),
    }),
    {
      name: 'ludo-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        _token: state._token,
      }),
    }
  )
);

export default useAuthStore;
