'use client';
import { motion } from 'framer-motion';
import { Users, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useGameStore from '@/store/gameStore';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';

const COLOR_CONFIG = {
  red:    { label: 'Red',    bg: 'bg-red-500/20',    border: 'border-red-500/40',    text: 'text-red-400',    dot: 'bg-red-500' },
  green:  { label: 'Green',  bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  yellow: { label: 'Yellow', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  blue:   { label: 'Blue',   bg: 'bg-blue-500/20',   border: 'border-blue-500/40',   text: 'text-blue-400',   dot: 'bg-blue-500' },
};

const SLOT_ORDER = ['red', 'green', 'yellow', 'blue'];

export default function WaitingRoom() {
  const router = useRouter();
  const { room, myColor } = useGameStore();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const playersByColor = Object.fromEntries(
    (room.players || []).map((p) => [p.color, p])
  );

  const joinedCount = room.players?.length || 0;

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.info('Room ID copied!');
  };

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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

            {/* Room ID */}
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400">Room ID:</span>
              <span className="text-sm font-mono text-white">{room.roomId}</span>
              <button onClick={copyRoomId} className="text-slate-400 hover:text-white transition-colors">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>{joinedCount}/4 players</span>
              <span>{4 - joinedCount} more needed</span>
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
          <div className="grid grid-cols-2 gap-4 mb-8">
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
                  transition={{ delay: SLOT_ORDER.indexOf(color) * 0.1 }}
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
                        <div className="w-4 h-4 rounded-full border-2 border-dashed border-current opacity-40" />
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

          {/* Waiting indicator */}
          {joinedCount < 4 && (
            <div className="flex items-center justify-center gap-3 text-slate-400">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Clock size={18} />
              </motion.div>
              <span className="text-sm">Waiting for {4 - joinedCount} more player{4 - joinedCount !== 1 ? 's' : ''}...</span>
            </div>
          )}

          {joinedCount >= 4 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium">All players joined! Starting game...</span>
              </div>
            </div>
          )}

          {/* Match info */}
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4 text-center text-sm">
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
      </div>
    </div>
  );
}
