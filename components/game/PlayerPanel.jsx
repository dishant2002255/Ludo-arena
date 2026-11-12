'use client';
import { motion } from 'framer-motion';
import Avatar from '@/components/ui/Avatar';
import useGameStore from '@/store/gameStore';

const COLOR_CONFIG = {
  red:    { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Red' },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Green' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'Yellow' },
  blue:   { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Blue' },
};

const TOKEN_STATES = {
  home: 'bg-slate-600',
  active: 'bg-current',
  finished: 'bg-current opacity-30',
};

export default function PlayerPanel({ color, gameState, myColor }) {
  const { room } = useGameStore();
  const cfg = COLOR_CONFIG[color];

  // Find player state in gameState
  const playerState = gameState?.players?.find(p => p.color === color);

  // Find player info from room
  const roomPlayer = room?.players?.find(p => p.color === color);
  const isCurrentTurn = gameState?.currentTurn === color;
  const isMe = color === myColor;

  const username = roomPlayer?.user?.username || color;
  const finishedTokens = playerState?.finishedTokens || 0;
  const tokens = playerState?.tokens || [];

  return (
    <motion.div
      className={`p-4 rounded-xl border ${cfg.bg} ${cfg.border} ${isCurrentTurn ? 'ring-1 ring-current' : ''}`}
      animate={isCurrentTurn ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 1.5, repeat: isCurrentTurn ? Infinity : 0 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
          bg-gradient-to-br text-white
          ${color === 'red' ? 'from-red-500 to-rose-600' :
            color === 'green' ? 'from-emerald-500 to-green-600' :
            color === 'yellow' ? 'from-yellow-500 to-amber-600' :
            'from-blue-500 to-indigo-600'}`}>
          {username?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${cfg.text} truncate`}>
            {username}
            {isMe && <span className="text-white/50 ml-1">(you)</span>}
          </p>
          {isCurrentTurn && (
            <p className="text-xs text-white/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Playing
            </p>
          )}
        </div>
        {/* Finished count */}
        <div className={`text-xs font-bold ${cfg.text}`}>{finishedTokens}/4</div>
      </div>

      {/* Token indicators */}
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => {
          const token = tokens[i];
          const state = token?.state || 'home';
          return (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border border-current/30
                ${state === 'finished' ? `${cfg.text.replace('text-', 'bg-').replace('-400', '-500')} opacity-40` :
                  state === 'active' ? `${cfg.text.replace('text-', 'bg-').replace('-400', '-500')} opacity-90` :
                  'bg-slate-700/50'
                }`}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
