'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Wallet, Gift, Headphones, User, Swords, Menu, Bell, X } from 'lucide-react';
import useAuthStore from '@/store/authStore';

// Bottom nav items
const NAV = [
  { href: '/dashboard',  icon: Home,        label: 'Home'    },
  { href: '/wallet',     icon: Wallet,       label: 'Wallet'  },
  { href: '/battles',    icon: Swords,       label: 'Battles' },
  { href: '/buy-coins',  icon: Gift,         label: 'Buy'     },
  { href: '/profile',    icon: User,         label: 'Profile' },
];

function TopBar({ onMenuOpen }) {
  const { user } = useAuthStore();
  return (
    <header className="top-header">
      {/* Logo + hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: '#f0e6c8', border: '1.5px solid #e8d49a' }}
        >
          <Menu size={18} style={{ color: '#c9960a' }} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
            style={{ background: 'linear-gradient(135deg,#f5c842,#c9960a)', color: '#3b2800' }}>
            LA
          </div>
          <span className="font-black text-base tracking-wide" style={{ color: '#3b2800' }}>
            LUDO <span style={{ color: '#c9960a' }}>ARENA</span>
          </span>
        </div>
      </div>

      {/* Right: bell + wallet + players */}
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-full flex items-center justify-center relative"
          style={{ background: '#f0e6c8', border: '1.5px solid #e8d49a' }}>
          <Bell size={16} style={{ color: '#c9960a' }} />
        </button>

        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: '#f0e6c8', border: '1.5px solid #e8d49a', color: '#7a5a00' }}>
          <Wallet size={13} />
          <span>₹{(user?.walletBalance || 0).toLocaleString()}</span>
        </div>
      </div>
    </header>
  );
}

function DrawerMenu({ open, onClose }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const items = [
    { icon: '🏠', label: 'Home',       href: '/dashboard' },
    { icon: '👤', label: 'My Profile', href: '/profile'   },
    { icon: '💼', label: 'My Wallet',  href: '/wallet'    },
    { icon: '⚔️', label: 'Battles',   href: '/battles'   },
    { icon: '💳', label: 'Buy Coins',  href: '/buy-coins' },
    { icon: '💸', label: 'Withdraw',   href: '/wallet'    },
  ];

  const handleLogout = () => { onClose(); logout(); router.push('/login'); };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col transition-transform duration-300"
        style={{
          background: '#fdf6e3',
          borderRight: '1.5px solid #e8d49a',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1.5px solid #e8d49a' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black"
              style={{ background: 'linear-gradient(135deg,#f5c842,#c9960a)', color: '#3b2800' }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: '#3b2800' }}>{user?.username}</p>
              <p className="text-xs" style={{ color: '#a09070' }}>₹{(user?.walletBalance || 0).toLocaleString()} coins</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#f0e6c8' }}>
            <X size={16} style={{ color: '#c9960a' }} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {items.map(({ icon, label, href }) => (
            <Link key={label} href={href} onClick={onClose}>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{ color: '#5a3c00' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0e6c8'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span className="text-xl w-7 text-center">{icon}</span>
                <span className="font-medium text-sm">{label}</span>
              </div>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4" style={{ borderTop: '1.5px solid #e8d49a' }}>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all"
            style={{ color: '#dc2626' }}>
            <span className="text-xl">🚪</span>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={href} href={href}>
            <div className={`bottom-nav-item ${active ? 'active' : ''}`}>
              <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                active ? '' : ''
              }`}
                style={active ? { background: '#fff3c4' } : {}}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export default function UserLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/login');
  }, [hydrated, isAuthenticated]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fdf6e3' }}>
        <div className="w-10 h-10 rounded-full border-4 border-[#e8d49a] border-t-[#c9960a] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#fdf6e3' }}>
      {/* Top bar */}
      <TopBar onMenuOpen={() => setDrawerOpen(true)} />

      {/* Slide-in drawer */}
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content — padded for top bar + bottom nav */}
      <main className="pb-20 pt-2 px-3 max-w-2xl mx-auto">
        {children}
      </main>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}
