'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Wallet, Gift, User, Swords, Menu, Bell, X } from 'lucide-react';
import useAuthStore from '@/store/authStore';

const WA_NUMBER = '6375933108';
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Hello%20Ludo%20Arena%20Support`;

// Bottom nav
const NAV = [
  { href: '/dashboard', icon: Home,   label: 'Home'    },
  { href: '/wallet',    icon: Wallet, label: 'Wallet'  },
  { href: '/battles',   icon: Swords, label: 'Battles' },
  { href: '/buy-coins', icon: Gift,   label: 'Buy'     },
  { href: '/profile',   icon: User,   label: 'Profile' },
];

// ── Ludo Arena SVG Logo ───────────────────────────────────────────────────────
function LudoArenaLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle */}
      <circle cx="30" cy="30" r="28" fill="url(#lg1)" stroke="#c9960a" strokeWidth="2"/>
      {/* Ludo cross shape */}
      <rect x="22" y="8"  width="16" height="44" rx="4" fill="rgba(255,255,255,0.25)"/>
      <rect x="8"  y="22" width="44" height="16" rx="4" fill="rgba(255,255,255,0.25)"/>
      {/* 4 colored corners */}
      <rect x="8"  y="8"  width="18" height="18" rx="4" fill="#ef4444"/>
      <rect x="34" y="8"  width="18" height="18" rx="4" fill="#22c55e"/>
      <rect x="8"  y="34" width="18" height="18" rx="4" fill="#3b82f6"/>
      <rect x="34" y="34" width="18" height="18" rx="4" fill="#eab308"/>
      {/* Center diamond */}
      <rect x="22" y="22" width="16" height="16" rx="3" fill="white"/>
      <text x="30" y="34" textAnchor="middle" fontSize="10" fontWeight="900" fill="#c9960a">LA</text>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f5c842"/>
          <stop offset="100%" stopColor="#c9960a"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Top Bar ───────────────────────────────────────────────────────────────────
function TopBar({ onMenuOpen }) {
  const { user } = useAuthStore();
  return (
    <header className="top-header">
      <div className="flex items-center gap-3">
        <button onClick={onMenuOpen}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: '#f0e6c8', border: '1.5px solid #e8d49a' }}>
          <Menu size={18} style={{ color: '#c9960a' }} />
        </button>

        <div className="flex items-center gap-2">
          <LudoArenaLogo size={36} />
          <span className="font-black text-base tracking-wide" style={{ color: '#3b2800' }}>
            LUDO <span style={{ color: '#c9960a' }}>ARENA</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-full flex items-center justify-center"
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

// ── Drawer Menu ───────────────────────────────────────────────────────────────
function DrawerMenu({ open, onClose }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const items = [
    { icon: '🏠', label: 'Home',        href: '/dashboard' },
    { icon: '⚔️', label: 'Battles',    href: '/battles'   },
    { icon: '💳', label: 'Buy Coins',  href: '/buy-coins' },
    { icon: '💼', label: 'My Wallet',  href: '/wallet'    },
    { icon: '💸', label: 'Withdraw',   href: '/wallet'    },
    { icon: '👤', label: 'My Profile', href: '/profile'   },
    { icon: '💬', label: 'WhatsApp Support', href: WA_LINK, external: true },
  ];

  const handleLogout = () => { onClose(); logout(); router.push('/login'); };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}

      <div className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col transition-transform duration-300"
        style={{
          background: '#fdf6e3',
          borderRight: '1.5px solid #e8d49a',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1.5px solid #e8d49a' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-base"
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

        {/* Logo inside drawer */}
        <div className="flex items-center justify-center gap-2 py-4"
          style={{ borderBottom: '1px solid #f0e6c8' }}>
          <LudoArenaLogo size={40} />
          <span className="font-black text-lg" style={{ color: '#3b2800' }}>
            LUDO <span style={{ color: '#c9960a' }}>ARENA</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-3 space-y-0.5 overflow-y-auto">
          {items.map(({ icon, label, href, external }) => (
            external ? (
              <a key={label} href={href} target="_blank" rel="noreferrer" onClick={onClose}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ color: '#25d366' }}>
                  <span className="text-xl w-7 text-center">{icon}</span>
                  <span className="font-semibold text-sm">{label}</span>
                </div>
              </a>
            ) : (
              <Link key={label} href={href} onClick={onClose}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-[#f0e6c8]"
                  style={{ color: '#5a3c00' }}>
                  <span className="text-xl w-7 text-center">{icon}</span>
                  <span className="font-semibold text-sm">{label}</span>
                </div>
              </Link>
            )
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4" style={{ borderTop: '1.5px solid #e8d49a' }}>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl"
            style={{ color: '#dc2626' }}>
            <span className="text-xl">🚪</span>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
        return (
          <Link key={href} href={href}>
            <div className={`bottom-nav-item ${active ? 'active' : ''}`}>
              <div className="w-8 h-8 flex items-center justify-center rounded-xl"
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

// ── WhatsApp FAB ──────────────────────────────────────────────────────────────
function WhatsAppFAB() {
  return (
    <a href={WA_LINK} target="_blank" rel="noreferrer"
      className="fixed z-50 flex items-center justify-center rounded-full shadow-lg active:scale-90 transition-transform"
      style={{
        bottom: '76px',   // above bottom nav
        right: '16px',
        width: '52px',
        height: '52px',
        background: '#25d366',
        boxShadow: '0 4px 16px rgba(37,211,102,0.5)',
      }}>
      {/* WhatsApp SVG */}
      <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.123 1.528 5.858L.057 23.428a.75.75 0 00.914.914l5.57-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.924 0-3.73-.504-5.288-1.385l-.376-.217-3.906 1.032 1.032-3.906-.217-.376A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
    </a>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function UserLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated]     = useState(false);
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
      <TopBar onMenuOpen={() => setDrawerOpen(true)} />
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="pb-20 pt-2 px-3 max-w-2xl mx-auto">
        {children}
      </main>

      <BottomNav />
      <WhatsAppFAB />
    </div>
  );
}
