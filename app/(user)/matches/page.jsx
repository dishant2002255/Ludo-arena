'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gamepad2, Coins, Trophy, Users, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';

export default function MatchesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data } = await api.get('/matches');
      setMatches(data.data || []);
    } catch {
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const joinMatch = async (matchId) => {
    if (!user) return;
    setJoining(matchId);
    try {
      const { data } = await api.post(`/matches/${matchId}/join`);
      toast.success('Joined match! Entering waiting room...');
      router.push(`/room/${data.data.room.roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join match');
    } finally {
      setJoining(null);
    }
  };

  const canAfford = (entryCoins) => (user?.walletBalance || 0) >= entryCoins;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Browse Matches</h1>
        <p className="text-slate-400 mt-1">Join a match and start playing Ludo</p>
      </div>

      {/* Coin balance reminder */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-sm">
        <Coins size={16} className="text-yellow-400" />
        <span className="text-slate-300">Your balance: </span>
        <span className="font-bold gold-text">{user?.walletBalance?.toLocaleString() || 0} coins</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="game-card p-16 text-center">
          <Gamepad2 size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium text-lg">No matches available</p>
          <p className="text-slate-500 text-sm mt-1">Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {matches.map((match, i) => (
            <motion.div
              key={match._id}
              className="game-card p-6 flex flex-col gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Gamepad2 size={20} className="text-purple-400" />
                </div>
                <StatusBadge status={match.status} />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">{match.name}</h3>
                {match.description && (
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2">{match.description}</p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Coins size={12} />
                    Entry
                  </div>
                  <p className="text-white font-bold text-lg">
                    {match.entryCoins === 0 ? 'Free' : `${match.entryCoins}`}
                    {match.entryCoins > 0 && <span className="text-xs text-slate-400 ml-1">coins</span>}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Trophy size={12} />
                    Win
                  </div>
                  <p className="text-emerald-400 font-bold text-lg">
                    {match.winnerReward}
                    <span className="text-xs text-slate-400 ml-1">coins</span>
                  </p>
                </div>
              </div>

              {/* Players */}
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Users size={14} />
                <span>4 players per room</span>
              </div>

              {/* Join button */}
              <Button
                fullWidth
                onClick={() => joinMatch(match._id)}
                loading={joining === match._id}
                disabled={!canAfford(match.entryCoins) || match.status !== 'active'}
                variant={!canAfford(match.entryCoins) ? 'secondary' : 'primary'}
              >
                {!canAfford(match.entryCoins)
                  ? `Need ${match.entryCoins} coins`
                  : joining === match._id
                  ? 'Joining...'
                  : match.entryCoins === 0
                  ? 'Join Free'
                  : `Join for ${match.entryCoins} coins`
                }
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
