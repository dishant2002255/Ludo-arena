import { create } from 'zustand';

let toastIdCounter = 0;

const useToastStore = create((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = ++toastIdCounter;
    set((state) => ({
      toasts: [...state.toasts, { id, ...toast }],
    }));

    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 4000);

    return id;
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Helper functions
export const toast = {
  success: (message, opts = {}) =>
    useToastStore.getState().addToast({ type: 'success', message, ...opts }),
  error: (message, opts = {}) =>
    useToastStore.getState().addToast({ type: 'error', message, ...opts }),
  info: (message, opts = {}) =>
    useToastStore.getState().addToast({ type: 'info', message, ...opts }),
  warning: (message, opts = {}) =>
    useToastStore.getState().addToast({ type: 'warning', message, ...opts }),
};

export default useToastStore;
