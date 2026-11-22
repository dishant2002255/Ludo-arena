'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, Menu, X, Coins } from 'lucide-react';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';

export default function SubAdminLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'sub_admin' && !['admin', 'main_admin'].includes(user?.role)) {
      router.push('/dashboard');
    }
  }, [hydrated, isAuthenticated, user?.role]);

  if (!hydrated || !isAuthenticated || (user?.role !== 'sub_admin' && !['admin', 'main_admin'].includes(user?.role))) {
    return (
      <div className="min-h-screen bg-gaming-gradient flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gaming-gradient">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy-950/80 border-r border-white/10 h-screen sticky top-0">
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white font-display">Sub-Admin Panel</p>
            <p className="text-xs text-slate-500">Ludo Arena</p>
          </div>
        </div>

        {user && (
          <div className="mx-4 my-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-yellow-400" />
              <span className="text-xs text-slate-400">Coin stock</span>
            </div>
            <p className="text-lg font-bold gold-text">
              {(user.subAdminInfo?.coinStock ?? 0).toLocaleString()} coins
            </p>
            <p className="text-xs text-slate-500">1 coin = ₹1</p>
          </div>
        )}

        <nav className="flex-1 px-3 py-2 space-y-1">
          {[
            ['/subadmin', 'Overview'],
            ['/subadmin?tab=payments', 'Payments'],
            ['/subadmin?tab=withdrawals', 'Withdrawals'],
            ['/subadmin?tab=battles', 'Battles'],
            ['/subadmin?tab=settings', 'UPI Settings'],
          ].map(([href, label]) => (
            <Link key={label} href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-medium text-sm">
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <Avatar username={user?.username || ''} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-navy-900/90 border border-white/10 text-white"
        onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
