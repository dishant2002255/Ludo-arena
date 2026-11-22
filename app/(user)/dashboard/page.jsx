'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Gamepad2, TrendingUp, Coins, ArrowRight, Swords } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { StatSkeleton, CardSkeleton } from '@/components/ui/LoadingSkeleton';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { generateTicker } from '@/lib/liveActivity';

export default function DashboardPage() {
  const { user, refreshUser } = useAuthStore();
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar username={user?.username} size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-white font-display">
              Welcome back, <span className="gradient-text">{user?.username}</span>! 👋
            </h1>
            <p className="text-slate-400 text-sm">Win battles. Earn real cash.</p>
          </div>
        </div>
        <Link href="/battles">
          <Button icon={<Swords size={18} />}>Open Battles</Button>
        </Link>
      </div>

      {/* Live ticker */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-yellow-500/20">
        <span className="shrink-0 flex items-center gap-1 text-xs text-red-400 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
        </span>
        <p className="text-xs text-slate-300 truncate">{liveTick}</p>
      </div>

      {/* Dual wallet summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
          <p className="text-xs text-blue-300 font-semibold mb-2 flex items-center gap-1"><Gamepad2 size={13} /> 🎮 Deposit Coins</p>
          <p className="text-3xl font-black text-blue-400">₹{totalDeposit.toLocaleString()}</p>
          <p className="text-xs text-blue-400/60 mt-1">Play Only — Not Withdrawable</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-xs text-emerald-300 font-semibold mb-2 flex items-center gap-1"><Trophy size={13} /> 🏆 Winning Coins</p>
          <p className="text-3xl font-black text-emerald-400">₹{totalWinning.toLocaleString()}</p>
          <p className="text-xs text-emerald-400/60 mt-1">Withdrawable to UPI ✓</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5">
          <p className="text-xs text-yellow-300 font-semibold mb-2 flex items-center gap-1"><Coins size={13} /> Total Playable</p>
          <p className="text-3xl font-black text-yellow-400">₹{(totalDeposit + totalWinning).toLocaleString()}</p>
          <p className="text-xs text-yellow-400/60 mt-1">Deposit + Winning</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/battles', icon: '⚔️', label: 'Open Battles' },
          { href: '/buy-coins', icon: '💳', label: 'Buy Coins' },
          { href: '/wallet', icon: '💼', label: 'My Wallet' },
          { href: '/wallet?tab=withdrawals', icon: '💸', label: 'Withdrawals' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="game-card p-4 text-center hover:border-purple-500/40 transition-all cursor-pointer">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-sm text-slate-300 font-medium">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
