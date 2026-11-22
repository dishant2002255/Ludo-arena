'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { generateLiveFeed, calcPrize } from '@/lib/liveActivity';
import { Users } from 'lucide-react';

const MODE_COLOR = {
  'Classic': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  '1 Kill': 'bg-red-500/20 text-red-300 border-red-500/40',
  'Quick': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'Popular': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
};

function BattleCard({ battle, onTransition }) {
  const [status, setStatus] = useState(battle.status);

  useEffect(() => {
    if (status !== 'live') return;
    const t = setTimeout(() => {
      setStatus('completed');
      onTransition && onTransition();
    }, (30 + Math.random() * 60) * 1000);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-700 ${
      status === 'live' ? 'border-red-500/40 bg-red-500/5' :
      status === 'completed' ? 'border-emerald-500/40 bg-emerald-500/5' :
      'border-yellow-500/30 bg-yellow-500/5'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${MODE_COLOR[battle.mode] || 'bg-white/10 text-white border-white/20'}`}>
          {battle.mode}
        </span>
        {status === 'live' && (
          <span className="flex items-center gap-1 text-xs text-red-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            LIVE
          </span>
        )}
        {status === 'completed' && (
          <span className="text-xs text-emerald-400 font-bold">✓ DONE</span>
        )}
        {status === 'open' && (
          <span className="flex items-center gap-1 text-xs text-yellow-400">
            <Users size={10} /> Waiting…
          </span>
        )}
      </div>

      {status === 'completed' ? (
        <div className="text-center py-1">
          <p className="text-emerald-400 font-bold text-sm">🏆 {battle.creator} WON!</p>
          <p className="text-white font-black text-lg">₹{battle.prize.toLocaleString()}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">{battle.creator}</p>
            {status === 'live' && <p className="text-slate-400 text-xs">⚔️ vs {battle.opponent}</p>}
          </div>
          <div className="text-right">
            <p className="text-yellow-400 font-bold">₹{battle.bet}</p>
            <p className="text-xs text-emerald-400">Win ₹{battle.prize}</p>
          </div>
        </div>
      )}

      {status === 'open' && (
        <Link href="/login">
          <button className="w-full mt-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-black tracking-wide hover:scale-105 transition-transform">
            Accept Challenge → ₹{battle.bet}
          </button>
        </Link>
      )}
    </div>
  );
}

export default function LiveBattleArena() {
  const [feed, setFeed] = useState(() => generateLiveFeed(12));
  const [tab, setTab] = useState('battles');
  const [onlineCount, setOnlineCount] = useState(feed.onlinePlayers);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((n) => n + Math.floor(Math.random() * 7) - 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeed((prev) => ({
        ...prev,
        winners: [
          {
            winner: `Player${Math.floor(Math.random() * 99)}`,
            loser: `Opp${Math.floor(Math.random() * 99)}`,
            bet: [200, 500, 1000][Math.floor(Math.random() * 3)],
            prize: calcPrize([200, 500, 1000][Math.floor(Math.random() * 3)], 2),
            mode: ['Classic', '1 Kill', 'Quick'][Math.floor(Math.random() * 3)],
            minsAgo: 1,
          },
          ...prev.winners.slice(0, 7),
        ],
      }));
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="live-arena" className="py-16 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          🟢 {Math.max(100, onlineCount)} Players Online Now
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
          Live <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">Battle Arena</span>
        </h2>
        <p className="text-slate-400">Real bets. Real money. Real Indian players.</p>
      </div>

      <div className="flex gap-2 justify-center mb-8">
        {[['battles', '🎲 Live Bets'], ['winners', '🏆 Recent Winners']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-6 py-2 rounded-xl text-sm font-semibold border transition-all ${tab === k ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'battles' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {feed.battles.map((b) => (
            <BattleCard key={b.id} battle={b} onTransition={() => {}} />
          ))}
        </div>
      )}

      {tab === 'winners' && (
        <div className="space-y-3 max-w-2xl mx-auto">
          {feed.winners.map((w, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center font-black text-black text-sm">
                  🏆
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{w.winner}</p>
                  <p className="text-slate-500 text-xs">beat {w.loser} · {w.mode}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-black">+₹{w.prize.toLocaleString()}</p>
                <p className="text-slate-500 text-xs">{w.minsAgo}m ago</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
