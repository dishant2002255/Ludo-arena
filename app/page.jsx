'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Swords, ArrowRight, Users } from 'lucide-react';
import { LiveTickerBar, LiveToast } from '@/components/landing/LiveTicker';
import LiveBattleArena from '@/components/landing/LiveBattleArena';

const LudoArena3DScene = dynamic(
  () => import('@/components/landing/LudoArena3DScene'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-yellow-500/30 border-t-yellow-500 animate-spin" />
      </div>
    ),
  }
);

const BET_CHIPS = [100, 200, 500, 1000, 2000, 5000];
const COMMISSION = 0.05;

function PrizeCalculator() {
  const [bet, setBet] = useState(500);
  const [players, setPlayers] = useState(2);
  const prize = Math.floor(bet * players * (1 - COMMISSION));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-black/40 backdrop-blur-xl border border-yellow-500/20 rounded-3xl p-6 mt-6"
    >
      <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-4">🎯 Instant Prize Calculator</p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {BET_CHIPS.map((b) => (
          <button
            key={b}
            onClick={() => setBet(b)}
            className={`py-2 rounded-xl text-sm font-bold border transition-all ${
              bet === b
                ? 'bg-yellow-500 text-black border-yellow-500'
                : 'bg-white/5 text-slate-300 border-white/10 hover:border-yellow-500/40'
            }`}
          >
            ₹{b}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {[2, 4].map((n) => (
          <button
            key={n}
            onClick={() => setPlayers(n)}
            className={`flex-1 py-2.5 rounded-xl font-bold border transition-all text-sm ${
              players === n
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            {n} Players
          </button>
        ))}
      </div>

      <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center">
        <p className="text-slate-400 text-xs mb-1">Your Entry: ₹{bet} → If You Win:</p>
        <motion.p
          key={prize}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300"
        >
          ₹{prize.toLocaleString()}
        </motion.p>
        <p className="text-xs text-emerald-400 mt-1">Instant Withdrawable Cash 🏆</p>
      </div>
    </motion.div>
  );
}

const STEPS = [
  { n: 1, icon: '💳', title: 'Coins Khareedo (UPI)', desc: 'Sub-Admin ka UPI scan karo, ₹200 se shuru — coins turant wallet mein.' },
  { n: 2, icon: '🎮', title: 'Room Banao & Bet Lagao', desc: 'Ludo King mein room banao, Room ID + apna bet amount post karo.' },
  { n: 3, icon: '⚔️', title: 'Khelo & Jeeto', desc: 'Match jeeto on Ludo King, win screenshot upload karo.' },
  { n: 4, icon: '💸', title: 'Winning Withdraw Karo', desc: 'Winning Wallet se GPay / PhonePe / Paytm mein directly withdraw karo!' },
];

const MODES = [
  { name: 'Classic 4-Goti', desc: 'Traditional Ludo King — All 4 tokens home wins', color: 'from-blue-600/30 to-indigo-600/30', border: 'border-blue-500/30', icon: '🎯' },
  { name: '1 Kill Mode', desc: 'Cut first opponent token to win instantly!', color: 'from-red-600/30 to-rose-600/30', border: 'border-red-500/30', icon: '⚡' },
  { name: 'Quick Ludo', desc: 'Faster game — Tokens start outside the house', color: 'from-emerald-600/30 to-green-600/30', border: 'border-emerald-500/30', icon: '🏃' },
  { name: 'Popular Mode', desc: '2 tokens in play — most played style in India', color: 'from-purple-600/30 to-violet-600/30', border: 'border-purple-500/30', icon: '🔥' },
];

export default function LandingPage() {
  const [onlineCount, setOnlineCount] = useState(142);

  useEffect(() => {
    const t = setInterval(() => setOnlineCount((n) => n + Math.floor(Math.random() * 5) - 2), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Global styles for marquee animation */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center">
              <Swords size={18} className="text-black" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              LUDO <span className="text-yellow-400">ARENA</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            🟢 {onlineCount} Players Live
          </div>

          <div className="flex gap-2">
            <Link href="/login">
              <button className="px-4 py-2 rounded-xl border border-white/20 text-slate-300 text-sm font-semibold hover:bg-white/5 transition-all">
                Login
              </button>
            </Link>
            <Link href="/register">
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-sm font-black hover:scale-105 transition-transform shadow-lg shadow-yellow-500/20">
                Register & Play ₹
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── TICKER ───────────────────────────────────────────────────────── */}
      <LiveTickerBar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pt-14 pb-10 grid lg:grid-cols-2 gap-10 items-center min-h-[80vh]">
        {/* Left copy */}
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold mb-5">
            🇮🇳 INDIA&apos;S #1 LUDO KING OPEN BATTLE ARENA · 1 COIN = ₹1
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-5">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500">
              Ludo King Room
            </span>
            <br />
            <span className="text-white">Banao. Bet Lagao.</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">
              Asli Cash ₹ Jeeto!
            </span>
          </h1>

          <p className="text-slate-400 text-lg mb-6 leading-relaxed">
            Choose your bet (₹50–₹10,000), share Ludo King Room Code, defeat your opponent &amp; withdraw winnings directly to{' '}
            <strong className="text-white">GPay / PhonePe / Paytm!</strong>
          </p>

          <PrizeCalculator />

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link href="/register" className="flex-1">
              <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-lg hover:scale-105 transition-transform shadow-xl shadow-yellow-500/30 flex items-center justify-center gap-2">
                🎲 Start Betting Now <ArrowRight size={18} />
              </button>
            </Link>
            <a href="#live-arena">
              <button className="w-full sm:w-auto py-4 px-6 rounded-2xl border border-red-500/40 text-red-400 font-bold hover:bg-red-500/10 transition-all flex items-center gap-2">
                🔥 Watch Live Bets
              </button>
            </a>
          </div>
        </motion.div>

        {/* Right — 3D Scene */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative h-[460px] lg:h-[520px]"
        >
          <LudoArena3DScene />
          {/* Floating stat pills */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {[
              { icon: '⚡', text: '2-Min UPI Payout' },
              { icon: '🛡️', text: '100% Verified' },
            ].map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/20 text-xs text-white backdrop-blur-sm"
              >
                {icon} {text}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── LIVE BATTLE ARENA ─────────────────────────────────────────────── */}
      <LiveBattleArena />

      {/* ── GAME MODES ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            4 Exciting{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
              Game Modes
            </span>
          </h2>
          <p className="text-slate-400">Pick your style and win real money!</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODES.map((mode) => (
            <motion.div
              key={mode.name}
              whileHover={{ scale: 1.03 }}
              className={`bg-gradient-to-br ${mode.color} border ${mode.border} rounded-2xl p-5 cursor-pointer`}
            >
              <div className="text-3xl mb-3">{mode.icon}</div>
              <h3 className="text-white font-bold mb-2">{mode.name}</h3>
              <p className="text-slate-400 text-sm">{mode.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW TO PLAY ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">
            Kaise Khelein &amp;{' '}
            <span className="text-yellow-400">Paisa Kaise Nikalein?</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <div className="text-3xl mb-3">{step.icon}</div>
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-xs font-black text-yellow-400">
                {step.n}
              </div>
              <h3 className="text-white font-bold mb-2 text-sm">{step.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── TRUST SIGNALS ────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-10">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: '50,000+', l: 'Players Registered' },
            { n: '₹2 Crore+', l: 'Total Payouts' },
            { n: '99.9%', l: 'Uptime' },
            { n: '< 2 Min', l: 'Avg UPI Payout' },
          ].map(({ n, l }) => (
            <div key={l}>
              <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
                {n}
              </p>
              <p className="text-slate-400 text-xs mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ───────────────────────────────────────────────────── */}
      <footer className="bg-black/40 border-t border-white/10 py-10 text-center px-4">
        <h3 className="text-2xl font-black text-white mb-4">
          Join 50,000+ Ludo King Winners Today!
        </h3>
        <Link href="/register">
          <button className="px-10 py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-lg hover:scale-105 transition-transform shadow-2xl shadow-yellow-500/30">
            🎲 Register & Win Now
          </button>
        </Link>
        <p className="text-slate-600 text-xs mt-6">
          © 2024 Ludo Arena · 18+ Only · Skill-based gaming · Please play responsibly
        </p>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-black/80 backdrop-blur-xl border-t border-white/10">
        <Link href="/register">
          <button className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            🔥 Live Bets ₹100–₹5,000 Open Now — Play Now →
          </button>
        </Link>
      </div>

      <LiveToast />
    </div>
  );
}
