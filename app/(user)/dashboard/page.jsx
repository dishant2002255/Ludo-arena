'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Swords, ShoppingCart, Wallet, User, ChevronRight } from 'lucide-react';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { generateTicker } from '@/lib/liveActivity';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [subWallets, setSubWallets] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [liveTick, setLiveTick]     = useState(() => generateTicker());

  useEffect(() => {
    const t = setInterval(() => setLiveTick(generateTicker()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/wallet/my-sub-wallets');
        setSubWallets(data.data || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const totalDeposit  = subWallets.reduce((s, w) => s + (w.depositBalance || 0), 0);
  const totalWinning  = subWallets.reduce((s, w) => s + (w.winningBalance || 0), 0);
  const total         = totalDeposit + totalWinning;

  const QUICK = [
    { href: '/battles',   icon: '⚔️',  label: 'Open Battles',  sub: 'Play & Win' },
    { href: '/buy-coins', icon: '💳',  label: 'Add Coins',     sub: 'via UPI'    },
    { href: '/wallet',    icon: '💼',  label: 'My Wallet',     sub: 'View all'   },
    { href: '/battles',   icon: '🏆',  label: 'Leaderboard',   sub: 'Top players'},
  ];

  return (
    <div className="animate-fade-in space-y-4">

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold" style={{ color: '#a09070' }}>Welcome back 👋</p>
          <h1 className="font-black text-xl" style={{ color: '#3b2800' }}>{user?.username}</h1>
        </div>
        <Link href="/profile">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-base"
            style={{ background: 'linear-gradient(135deg,#f5c842,#c9960a)', color: '#3b2800' }}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
        </Link>
      </div>

      {/* Live ticker */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl overflow-hidden"
        style={{ background: '#fff3c4', border: '1.5px solid #e8c84a' }}>
        <span className="shrink-0 flex items-center gap-1 text-[10px] font-black" style={{ color: '#dc2626' }}>
          <span className="live-dot" /> LIVE
        </span>
        <p className="text-xs truncate" style={{ color: '#7a5a00' }}>{liveTick}</p>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#fff3c4,#fde68a)', border: '1.5px solid #e8c84a' }}>
        <p className="text-xs font-semibold" style={{ color: '#7a5a00' }}>Total Balance</p>
        {loading ? (
          <div className="h-10 w-28 rounded-xl mt-1" style={{ background: '#e8c84a', opacity: 0.4 }} />
        ) : (
          <p className="font-black text-4xl mt-0.5" style={{ color: '#3b2800' }}>₹{total.toLocaleString()}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <p className="text-[10px] font-semibold" style={{ color: '#7a5a00' }}>🎮 Deposit Coins</p>
            <p className="font-black text-lg" style={{ color: '#5b21b6' }}>₹{totalDeposit.toLocaleString()}</p>
            <p className="text-[10px]" style={{ color: '#a09070' }}>Play only</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <p className="text-[10px] font-semibold" style={{ color: '#7a5a00' }}>🏆 Winning Coins</p>
            <p className="font-black text-lg" style={{ color: '#0a7a3c' }}>₹{totalWinning.toLocaleString()}</p>
            <p className="text-[10px]" style={{ color: '#a09070' }}>Withdrawable ✓</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {QUICK.map(item => (
          <Link key={item.href + item.label} href={item.href}>
            <div className="rounded-2xl p-4 flex items-center gap-3 active:scale-98 transition-transform"
              style={{ background: '#fffdf5', border: '1.5px solid #e8d49a' }}>
              <span className="text-2xl">{item.icon}</span>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: '#3b2800' }}>{item.label}</p>
                <p className="text-xs" style={{ color: '#a09070' }}>{item.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Play now CTA */}
      <Link href="/battles">
        <div className="rounded-2xl p-4 flex items-center justify-between active:scale-98 transition-transform"
          style={{ background: 'linear-gradient(135deg,#e8f8f0,#d0f0e0)', border: '1.5px solid #a8dfc0' }}>
          <div>
            <p className="font-black text-base" style={{ color: '#1a3c24' }}>⚔️ Open Battles</p>
            <p className="text-xs" style={{ color: '#7ecba4' }}>Create or join a Ludo King challenge</p>
          </div>
          <div className="px-5 py-2 rounded-full font-black text-sm"
            style={{ background: 'linear-gradient(to bottom,#2ecc71,#0a7a3c)', color: '#fff', boxShadow: '0 2px 8px rgba(10,122,60,0.3)' }}>
            PLAY
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="info-banner text-xs">
        🏆 <strong>Winning Coins only</strong> can be withdrawn to UPI.
        Buy Deposit Coins to play battles and win real cash!
      </div>
    </div>
  );
}
