'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Users, Coins, ArrowRight, Star, Shield, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';

const features = [
  { icon: <Users size={24} />, title: '4-Player Real-Time', desc: 'Challenge 3 other players in live multiplayer matches. Every move is synchronized.' },
  { icon: <Gamepad2 size={24} />, title: 'Classic Ludo Rules', desc: 'Faithful traditional Ludo gameplay with server-validated moves and dice rolls.' },
  { icon: <Coins size={24} />, title: 'Virtual Coins', desc: 'Earn coins by winning. Climb the leaderboard. Show off your skill — no real money.' },
  { icon: <Zap size={24} />, title: 'Instant Matchmaking', desc: 'Browse available matches, join with one click, and start playing immediately.' },
  { icon: <Shield size={24} />, title: 'Fair Play Guaranteed', desc: 'All dice rolls and moves are server-side validated. Zero cheating possible.' },
  { icon: <Trophy size={24} />, title: 'Global Leaderboard', desc: 'Compete for the top spot. Stats, win rates, and history tracked for every player.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gaming-gradient">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Gamepad2 size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text font-display">Ludo Arena</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="secondary" size="sm">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Play Now</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-8">
            <Star size={14} fill="currentColor" />
            Free to Play — No Real Money
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white font-display mb-6 leading-tight">
            Play Ludo.<br />
            <span className="gradient-text">Win Coins.</span><br />
            Rule the Board.
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The most polished online Ludo experience. Real-time 4-player matches,
            server-verified gameplay, and a competitive coin economy — all for free.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-10">
                Start Playing Free
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="secondary" size="lg" className="text-lg">
                <Trophy size={20} />
                Leaderboard
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: '4-Player', label: 'Real-time Rooms' },
            { value: '500', label: 'Welcome Coins' },
            { value: '100%', label: 'Server-Validated' },
            { value: 'Free', label: 'Always & Forever' },
          ].map((stat) => (
            <div key={stat.label} className="game-card p-6">
              <p className="text-3xl font-black gradient-text font-display">{stat.value}</p>
              <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-white font-display mb-3">
            Everything you need
          </h2>
          <p className="text-slate-400 text-lg">Built for serious Ludo players.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="game-card-hover p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="game-card p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-purple-glow opacity-30" />
          <div className="relative">
            <h2 className="text-4xl font-bold text-white font-display mb-4">
              Ready to play?
            </h2>
            <p className="text-slate-400 mb-8">
              Register now and get 500 free coins. No credit card required.
            </p>
            <Link href="/register">
              <Button size="lg" className="text-lg px-10">
                Create Free Account
                <ArrowRight size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-slate-500 text-sm">
        <p>© 2026 Ludo Arena. A free-to-play platform. No real money involved.</p>
      </footer>
    </div>
  );
}
