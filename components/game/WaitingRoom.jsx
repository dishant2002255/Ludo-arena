'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Users, Clock, Copy, Check, Eye, EyeOff, Smartphone, Download, ExternalLink } from 'lucide-react';
import useGameStore from '@/store/gameStore';
import useAuthStore from '@/store/authStore';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';

const COLOR_CONFIG = {
  red:    { label: 'Red',    bg: 'bg-red-500/20',     border: 'border-red-500/40',     text: 'text-red-400',     dot: 'bg-red-500' },
  green:  { label: 'Green',  bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  yellow: { label: 'Yellow', bg: 'bg-yellow-500/20',  border: 'border-yellow-500/40',  text: 'text-yellow-400',  dot: 'bg-yellow-500' },
  blue:   { label: 'Blue',   bg: 'bg-blue-500/20',    border: 'border-blue-500/40',    text: 'text-blue-400',    dot: 'bg-blue-500' },
};

const SLOT_ORDER = ['red', 'green', 'yellow', 'blue'];

// Ludo King download links
const LUDO_KING_LINKS = {
  android: 'https://play.google.com/store/apps/details?id=com.ludo.king',
  ios:     'https://apps.apple.com/app/ludo-king/id993090598',
};

export default function WaitingRoom() {
  const { room, myColor } = useGameStore();
  const { user } = useAuthStore();

  const [copiedKey, setCopiedKey]   = useState('');
  const [showPass, setShowPass]     = useState(false);

  if (!room) return null;

  const playersByColor = Object.fromEntries(
    (room.players || []).map((p) => [p.color, p])
  );

  const joinedCount        = room.players?.length || 0;
  const allJoined          = joinedCount >= 4;
  const hasCredentials     = !!(room.externalRoomId);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      toast.success('Copied!');
      setTimeout(() => setCopiedKey(''), 2000);
    });
  };

  // Detect mobile platform for smart Ludo King button
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIOS     = typeof navigator !== 'undefined' && /iPhone|iPad/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-5">

        {/* ── Main card ─────────────────────────────────────────────────── */}
        <motion.div
          className="game-card p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white font-display">Waiting Room</h1>
            <p className="text-slate-400 mt-1 text-sm">
              {room.match?.name || 'Match'} · {joinedCount}/4 players joined
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>{joinedCount}/4 players</span>
              <span>{allJoined ? 'All joined!' : `${4 - joinedCount} more needed`}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(joinedCount / 4) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Player slots */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {SLOT_ORDER.map((color) => {
              const config = COLOR_CONFIG[color];
              const player = playersByColor[color];
              const isMe = player && (
                player.user?._id?.toString() === user?._id?.toString() ||
                player.user?.toString() === user?._id?.toString()
              );
              return (
                <motion.div
                  key={color}
                  className={`p-4 rounded-xl border ${config.bg} ${config.border} flex items-center gap-3`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: SLOT_ORDER.indexOf(color) * 0.08 }}
                >
                  <div className={`w-10 h-10 rounded-full ${config.dot} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {player ? (player.user?.username || 'P')?.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {player ? (
                      <>
                        <p className={`text-sm font-semibold ${config.text} truncate`}>
                          {player.user?.username || 'Player'}
                          {isMe && <span className="ml-1 text-xs text-white/50">(you)</span>}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${player.isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span className="text-xs text-slate-500">
                            {player.isConnected ? 'Connected' : 'Connecting...'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-dashed border-current opacity-30" />
                        <p className="text-sm text-slate-500">Waiting...</p>
                      </div>
                    )}
                  </div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
                    {config.label}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Status message */}
          {!allJoined && (
            <div className="flex items-center justify-center gap-3 text-slate-400 mb-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <Clock size={18} />
              </motion.div>
              <span className="text-sm">Waiting for {4 - joinedCount} more player{4 - joinedCount !== 1 ? 's' : ''}…</span>
            </div>
          )}

          {allJoined && !hasCredentials && (
            <div className="text-center space-y-2 py-2">
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-sm font-medium">All players joined!</span>
              </div>
              <p className="text-slate-400 text-xs">
                Waiting for admin to create a Ludo King room and share the Room ID…
              </p>
            </div>
          )}

          {/* Match info footer */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <p className="text-slate-500 text-xs">Entry</p>
              <p className="text-white font-semibold">
                {room.entryCoins === 0 ? 'Free' : `${room.entryCoins} coins`}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Winner Reward</p>
              <p className="text-emerald-400 font-semibold">{room.winnerReward} coins</p>
            </div>
          </div>
        </motion.div>

        {/* ── Ludo King Room Credentials (shown after admin publishes) ───── */}
        <AnimatePresence>
          {allJoined && hasCredentials && (
            <motion.div
              className="game-card p-6 space-y-5 border-purple-500/30 bg-purple-500/5"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Smartphone size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-base">🎮 Ludo King Room Ready!</p>
                  <p className="text-slate-400 text-xs">Admin has shared the room details</p>
                </div>
              </div>

              {/* How to join steps */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1.5">
                <p className="text-slate-200 font-semibold mb-2">How to join:</p>
                <p>1. Open <strong className="text-white">Ludo King</strong> on your phone</p>
                <p>2. Tap <strong className="text-white">Play Online → Private Room → Join Room</strong></p>
                <p>3. Enter the Room ID and Password below</p>
              </div>

              {/* Room ID */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Room ID</p>
                  <p className="text-white font-mono font-bold text-xl tracking-widest">{room.externalRoomId}</p>
                </div>
                <button
                  onClick={() => copyText(room.externalRoomId, 'roomid')}
                  className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-all shrink-0"
                >
                  {copiedKey === 'roomid' ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                </button>
              </div>

              {/* Password */}
              {room.externalRoomPassword && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Room Password</p>
                    <p className="text-white font-mono font-bold text-lg tracking-widest">
                      {showPass ? room.externalRoomPassword : '••••••'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setShowPass(v => !v)}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => copyText(room.externalRoomPassword, 'pass')}
                      className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-all"
                    >
                      {copiedKey === 'pass' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Ludo King Open / Download */}
              <div className="space-y-3">
                {/* Smart button: if mobile, open app — if desktop, show download */}
                {isMobile ? (
                  <a
                    href={isIOS ? LUDO_KING_LINKS.ios : LUDO_KING_LINKS.android}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-semibold"
                  >
                    <ExternalLink size={18} />
                    Open Ludo King
                  </a>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={LUDO_KING_LINKS.android}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-all"
                    >
                      <Download size={16} />
                      Android
                    </a>
                    <a
                      href={LUDO_KING_LINKS.ios}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/25 transition-all"
                    >
                      <Download size={16} />
                      iPhone
                    </a>
                  </div>
                )}

                <p className="text-xs text-slate-500 text-center">
                  Don't have Ludo King? Download it free from your app store.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
