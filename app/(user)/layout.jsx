'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserSidebar from '@/components/layout/UserSidebar';
import useAuthStore from '@/store/authStore';

export default function UserLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, user, refreshUser } = useAuthStore();
  // Track whether hydration has completed so we don't flash-redirect
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Zustand persist rehydrates synchronously in newer versions but we
    // guard with a flag to be safe across all environments.
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated]);

  // Show spinner while hydrating (avoids flash of redirect)
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gaming-gradient flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // After hydration, if not authenticated show spinner briefly while redirect fires
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gaming-gradient flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gaming-gradient">
      <UserSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
