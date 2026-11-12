import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api/axios';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({ user: data.data.user, isAuthenticated: true, isLoading: false });
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
          set({ user: data.data.user, isAuthenticated: true, isLoading: false });
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
        set({ user: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data.user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      updateBalance: (newBalance) =>
        set((state) => ({
          user: state.user ? { ...state.user, walletBalance: newBalance } : null,
        })),
    }),
    {
      name: 'ludo-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
