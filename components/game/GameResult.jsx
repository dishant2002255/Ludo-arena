'use client';
import { motion } from 'framer-motion';
import { Trophy, Coins, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useGameStore from '@/store/gameStore';
import useAuthStore from '@/store/authStore';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

const COLOR_CONFIG = {
  red:    { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  green:  { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  blue:   { text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

export default function GameResult() {
  const router = useRouter();
  const { winner, myColor, gameState, room } = useGameStore();
  const { user, refreshUser } = useAuthStore();

  const isWinner = winner?.winnerColor === myColor;
  const winnerUsername = room?.players?.find(p => p.color === winner?.winnerColor)?.user?.username || winner?.winnerColor;

  const handlePlayAgain = () => {
    refreshUser();
    router.push('/matches');
  };

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="game-card p-8 text-center">
          {/* Winner trophy */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isWinner ? (
              <>
                <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trophy size={40} className="text-yellow-400" />
                </div>
                <h1 className="text-3xl font-black gold-text font-display mb-2">You Won! 🎉</h1>
                <p className="text-slate-400">Congratulations! You are the Ludo Arena champion!</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4 text-4xl">
                  😔
                </div>
                <h1 className="text-2xl font-bold text-white font-display mb-2">Match Over</h1>
                <p className="text-slate-400">
                  <span className={COLOR_CONFIG[winner?.winnerColor]?.text}>{winnerUsername}</span> wins this round!
                </p>
              </>
            )}
          </motion.div>

          {/* Player results */}
          {gameState?.players && (
            <div className="mt-6 space-y-2">
              {gameState.players.map((p, i) => {
                const roomPlayer = room?.players?.find(rp => rp.color === p.color);
                const isMe = p.color === myColor;
                return (
                  <div key={p.color}
                    className={`flex items-center justify-between p-3 rounded-xl border ${COLOR_CONFIG[p.color]?.bg}`}>
                    <div className="flex items-center gap-2">
                      <Avatar username={roomPlayer?.user?.username || p.color} size="sm" />
                      <div className="text-left">
                        <p className={`text-sm font-medium ${COLOR_CONFIG[p.color]?.text}`}>
                          {roomPlayer?.user?.username || p.color}
                          {isMe && <span className="text-white/40 ml-1">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{p.finishedTokens || 0}/4 tokens home</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {p.color === winner?.winnerColor ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-sm font-bold">
                          <Coins size={14} />
                          +{room?.winnerReward || 0}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <Button fullWidth onClick={handlePlayAgain} icon={<ArrowRight size={18} />}>
              Play Again
            </Button>
            <Button fullWidth variant="secondary" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
