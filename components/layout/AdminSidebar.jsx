'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Gamepad2, DoorOpen, BarChart3,
  FileText, Bell, LogOut, Shield, Menu, X, Wallet, Trophy, CreditCard, Settings
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';

const navItems = [
  { href: '/admin/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/tournaments', label: 'Tournaments',  icon: Trophy },
  { href: '/admin/payments',    label: 'Payments',     icon: CreditCard },
  { href: '/admin/users',       label: 'Users',        icon: Users },
  { href: '/admin/matches',     label: 'Matches',      icon: Gamepad2 },
  { href: '/admin/rooms',       label: 'Rooms',        icon: DoorOpen },
  { href: '/admin/wallet',      label: 'Wallet',       icon: Wallet },
  { href: '/admin/results',     label: 'Results',      icon: BarChart3 },
  { href: '/admin/logs',        label: 'Audit Logs',   icon: FileText },
  { href: '/admin/settings',    label: 'Settings',     icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLink = ({ item }) => {
    const Icon = item.icon;
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
          ${active
            ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
      >
        <Icon size={18} className={active ? 'text-indigo-400' : ''} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const Content = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white font-display">Admin Panel</p>
            <p className="text-xs text-slate-500">Ludo Arena</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {user && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <Avatar username={user.username} size="sm" color="blue" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <span className="text-xs bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full border border-indigo-500/30">
                Admin
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 bg-navy-950/90 border-r border-white/10 h-screen sticky top-0">
        <Content />
      </aside>

      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-navy-900/90 border border-white/10 text-white"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <motion.div
          className="lg:hidden fixed inset-0 z-40 flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <motion.aside
            className="relative w-64 bg-navy-950 h-full overflow-y-auto"
            initial={{ x: -260 }}
            animate={{ x: 0 }}
          >
            <Content />
          </motion.aside>
        </motion.div>
      )}
    </>
  );
}
