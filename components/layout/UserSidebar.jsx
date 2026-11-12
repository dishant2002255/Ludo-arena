'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Gamepad2, Wallet, Trophy, User, LogOut, Coins, Menu, X, BookOpen
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/tournaments',  label: 'Tournaments',  icon: Trophy },
  { href: '/matches',      label: 'Classic Play', icon: Gamepad2 },
  { href: '/buy-coins',    label: 'Buy Coins',    icon: Coins },
  { href: '/wallet',       label: 'Wallet',       icon: Wallet },
  { href: '/leaderboard',  label: 'Leaderboard',  icon: Trophy },
  { href: '/rules',        label: 'Rules',        icon: BookOpen },
  { href: '/profile',      label: 'Profile',      icon: User },
];

export default function UserSidebar() {
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
            ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20 text-white border border-purple-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
      >
        <Icon size={20} className={active ? 'text-purple-400' : ''} />
        <span>{item.label}</span>
        {active && (
          <motion.div
            className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400"
            layoutId="nav-dot"
          />
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Gamepad2 size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text font-display">Ludo Arena</span>
        </Link>
      </div>

      {/* Coin balance */}
      {user && (
        <div className="mx-4 my-4 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-yellow-400" />
            <span className="text-xs text-slate-400">Balance</span>
          </div>
          <p className="text-lg font-bold gold-text">{user.walletBalance?.toLocaleString()} coins</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <Avatar username={user.username} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy-950/80 border-r border-white/10 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-navy-900/90 border border-white/10 text-white"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <motion.div
          className="lg:hidden fixed inset-0 z-40 flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <motion.aside
            className="relative w-72 bg-navy-950 h-full overflow-y-auto"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <SidebarContent />
          </motion.aside>
        </motion.div>
      )}
    </>
  );
}
