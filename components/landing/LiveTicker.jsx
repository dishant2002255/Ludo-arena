'use client';
import { useEffect, useState } from 'react';
import { generateTicker } from '@/lib/liveActivity';

export function LiveTickerBar() {
  const [items, setItems] = useState([
    '🎲 Rohit_JPR ne ₹500 ki 1 Kill bet lagayi!',
    '🏆 Vikram_RJ just WON ₹1,900 against Mohit_44 (Classic)!',
    '⚡ Sandeep_K withdrew ₹2,400 Winning Cash via UPI!',
    '🔥 Aakash_07 accepted ₹300 Quick Ludo Battle!',
    '💰 KingLudo_99 posted ₹2,000 open challenge!',
    '✅ Harsh_RJ14 verified win — ₹950 credited instantly!',
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => [generateTicker(), ...prev.slice(0, 11)]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/40 border-y border-yellow-500/20 overflow-hidden py-2">
      <div className="flex items-center gap-2 px-4">
        <span className="shrink-0 text-xs font-bold text-yellow-400 uppercase tracking-widest">🔴 LIVE</span>
        <div className="overflow-hidden flex-1">
          <div
            className="flex gap-8 whitespace-nowrap"
            style={{ animation: 'marquee 30s linear infinite' }}
          >
            {[...items, ...items].map((item, i) => (
              <span key={i} className="text-xs text-slate-300 shrink-0">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveToast() {
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => {
      setToast(generateTicker());
      setVisible(true);
      setTimeout(() => setVisible(false), 3500);
    };
    const delay = Math.random() * 3000 + 2000;
    const t = setTimeout(show, delay);
    const interval = setInterval(show, 7000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, []);

  return (
    <div
      className={`fixed bottom-24 right-4 z-50 max-w-xs transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      <div className="bg-black/90 border border-yellow-500/40 rounded-2xl px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-sm">
        {toast}
      </div>
    </div>
  );
}
