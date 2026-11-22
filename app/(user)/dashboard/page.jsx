'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Swords, Download } from 'lucide-react';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { generateTicker, generateLiveFeed, calcPrize } from '@/lib/liveActivity';

const WA_NUMBER = '6375933108';
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Hello%20Ludo%20Arena%20Support`;
const LUDO_KING_LINK = 'https://play.google.com/store/apps/details?id=com.ludo.king';

// ── Fake Running Battle card ──────────────────────────────────────────────────
function FakeRunningCard({ battle }) {
  const [finished, setFinished] = useState(false);
  const [winner, setWinner]     = useState('');

  useEffect(() => {
    const delay = (20 + Math.random() * 50) * 1000;
    const t = setTimeout(() => {
      setFinished(true);
      setWinner(Math.random() > 0.5 ? battle.creator : battle.opponent);
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rounded-2xl p-4 mb-3"
      style={{ background: 'linear-gradient(135deg,#e8f8f0,#d0f0e0)', border: '1.5px solid #7ecba4' }}>

      {!finished ? (
        <>
          <div className="flex items-center justify-between mb-2 text-xs font-bold" style={{ color: '#0a7a3c' }}>
            <span>PLAYING FOR : <span style={{ color: '#c9960a' }}>₹</span>{battle.bet}</span>
            <span>PRIZE : <span style={{ color: '#c9960a' }}>₹</span>{battle.prize}</span>
          </div>
          <div className="flex items-center justify-between">
            {/* Player 1 */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs"
                style={{ background: '#c9960a', color: '#fff' }}>
                {battle.creator.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-sm" style={{ color: '#1a3c24' }}>{battle.creator}</span>
            </div>

            {/* VS badge */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: '#dcfce7', color: '#0a7a3c', border: '1px solid #a8dfc0' }}>
                LIVE
              </span>
              <span className="text-base">⚡</span>
            </div>

            {/* Player 2 */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: '#1a3c24' }}>{battle.opponent}</span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs"
                style={{ background: '#7ecba4', color: '#fff' }}>
                {battle.opponent.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: '#7ecba4' }}>{battle.mode} Mode</p>
        </>
      ) : (
        <div className="text-center py-1">
          <p className="text-sm font-black" style={{ color: '#0a7a3c' }}>🏆 {winner} WON!</p>
          <p className="text-xs" style={{ color: '#c9960a' }}>+₹{battle.prize} credited instantly</p>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [subWallets, setSubWallets]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [liveTick, setLiveTick]           = useState(() => generateTicker());
  const [fakeBattles, setFakeBattles]     = useState([]);

  // Live ticker rotation
  useEffect(() => {
    const t = setInterval(() => setLiveTick(generateTicker()), 5000);
    return () => clearInterval(t);
  }, []);

  // Generate initial fake running battles
  useEffect(() => {
    const feed = generateLiveFeed(5);
    setFakeBattles(feed.battles.filter(b => b.status === 'live').slice(0, 4));
  }, []);

  // Refresh fake battles periodically
  useEffect(() => {
    const t = setInterval(() => {
      const feed = generateLiveFeed(5);
      setFakeBattles(feed.battles.filter(b => b.status === 'live').slice(0, 4));
    }, 90000); // regenerate every 90s
    return () => clearInterval(t);
  }, []);

  // Fetch real sub-wallets
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/wallet/my-sub-wallets');
        setSubWallets(data.data || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const totalDeposit = subWallets.reduce((s, w) => s + (w.depositBalance || 0), 0);
  const totalWinning = subWallets.reduce((s, w) => s + (w.winningBalance || 0), 0);
  const total        = totalDeposit + totalWinning;

  return (
    <div className="animate-fade-in space-y-4 pb-6">

      {/* ── Greeting ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold" style={{ color: '#a09070' }}>Welcome back 👋</p>
          <h1 className="font-black text-xl" style={{ color: '#3b2800' }}>{user?.username}</h1>
        </div>
        <Link href="/profile">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-base"
            style={{ background: 'linear-gradient(135deg,#f5c842,#c9960a)', color: '#3b2800', boxShadow: '0 3px 10px rgba(201,150,10,0.3)' }}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
        </Link>
      </div>

      {/* ── Live ticker ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl overflow-hidden"
        style={{ background: '#fff3c4', border: '1.5px solid #e8c84a' }}>
        <span className="shrink-0 flex items-center gap-1 text-[10px] font-black" style={{ color: '#dc2626' }}>
          <span className="live-dot" /> LIVE
        </span>
        <p className="text-xs truncate" style={{ color: '#7a5a00' }}>{liveTick}</p>
      </div>

      {/* ── Balance card ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#fff3c4,#fde68a)', border: '1.5px solid #e8c84a' }}>
        <p className="text-xs font-semibold" style={{ color: '#7a5a00' }}>Total Balance</p>
        {loading ? (
          <div className="h-10 w-28 rounded-xl mt-1 animate-pulse" style={{ background: '#e8c84a', opacity: 0.4 }} />
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

      {/* ── 2 Feature Cards (like AM2PM — Ludo Classic + Support) ───────────── */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-3 text-center"
          style={{ color: '#a09070' }}>OUR FEATURES</p>

        <div className="grid grid-cols-2 gap-3">
          {/* Open Battles card */}
          <Link href="/battles">
            <div className="rounded-2xl overflow-hidden border active:scale-98 transition-transform"
              style={{ border: '1.5px solid #e8d49a', background: '#fffdf5' }}>
              {/* Image area */}
              <div className="relative h-32 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#1a0a3c,#0d1440)' }}>
                {/* LIVE badge */}
                <span className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: '#fde68a', color: '#3b2800' }}>LIVE</span>
                {/* Dice & tokens illustration using emojis */}
                <div className="text-center">
                  <div className="text-5xl mb-1">🎲</div>
                  <div className="flex justify-center gap-1 text-xl">
                    <span>🔴</span><span>🟢</span><span>🟡</span><span>🔵</span>
                  </div>
                </div>
              </div>
              {/* Label */}
              <div className="px-3 py-2.5">
                <p className="text-[11px] font-semibold" style={{ color: '#a09070' }}>₹100 – ₹10,000</p>
                <div className="mt-1.5 py-2 rounded-xl text-center font-black text-xs"
                  style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800' }}>
                  OPEN BATTLES
                </div>
              </div>
            </div>
          </Link>

          {/* WhatsApp Support card */}
          <a href={WA_LINK} target="_blank" rel="noreferrer">
            <div className="rounded-2xl overflow-hidden border active:scale-98 transition-transform"
              style={{ border: '1.5px solid #e8d49a', background: '#fffdf5' }}>
              {/* Image area */}
              <div className="relative h-32 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#f5e9c8,#fde68a)' }}>
                <span className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: '#dcfce7', color: '#0a7a3c' }}>LIVE</span>
                {/* WhatsApp icon */}
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: '#fff', boxShadow: '0 4px 16px rgba(37,211,102,0.3)', border: '3px solid #25d366' }}>
                  <svg viewBox="0 0 24 24" width="44" height="44" fill="#25d366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.123 1.528 5.858L.057 23.428a.75.75 0 00.914.914l5.57-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.924 0-3.73-.504-5.288-1.385l-.376-.217-3.906 1.032 1.032-3.906-.217-.376A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                </div>
              </div>
              {/* Label */}
              <div className="px-3 py-2.5">
                <p className="text-[11px] font-semibold" style={{ color: '#a09070' }}>24/7 Available</p>
                <div className="mt-1.5 py-2 rounded-xl text-center font-black text-xs"
                  style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800' }}>
                  SUPPORT
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* ── Download Ludo King button ─────────────────────────────────────── */}
      <a href={LUDO_KING_LINK} target="_blank" rel="noreferrer">
        <div className="rounded-2xl py-4 flex items-center justify-center gap-3 active:scale-98 transition-transform"
          style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', boxShadow: '0 3px 12px rgba(201,150,10,0.3)' }}>
          <Download size={20} style={{ color: '#3b2800' }} />
          <span className="font-black text-base" style={{ color: '#3b2800' }}>Download Ludo King App</span>
        </div>
      </a>

      {/* ── Running Battles (Fake) ────────────────────────────────────────── */}
      {fakeBattles.length > 0 && (
        <div>
          {/* Section pill */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-3"
            style={{ background: '#fff3c4', border: '1.5px solid #e8c84a' }}>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-black"
                style={{ background: '#e8c84a', color: '#7a5a00' }}>✕</span>
              <span className="text-sm font-black" style={{ color: '#7a5a00' }}>Running Battles</span>
            </div>
            <span className="live-dot" />
          </div>

          {fakeBattles.map((b, i) => (
            <FakeRunningCard key={i} battle={b} />
          ))}
        </div>
      )}

      {/* ── Info banner ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl px-4 py-3 text-xs"
        style={{ background: '#fffde8', border: '1.5px solid #f0d060', color: '#5a4200' }}>
        ⚡ <strong>Super Fast Withdrawal</strong> — आमतौर पर 5 मिनट में। देरी हो तो WhatsApp Support से संपर्क करें। 😊
      </div>

      {/* Bottom spacer for WhatsApp FAB */}
      <div className="h-4" />
    </div>
  );
}
