'use client';
import { useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data } = await api.get('/users/leaderboard');
      setPlayers(data.data || []);
    } catch { toast.error('Failed to load leaderboard'); }
    finally { setLoading(false); }
  };

  const rankIcon = (rank) => {
    if (rank === 1) return <Trophy size={18} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={18} className="text-slate-300" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return <span className="text-slate-500 text-sm font-mono w-5 text-center">{rank}</span>;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Leaderboard</h1>
        <p className="text-slate-400 mt-1">Top players by wins</p>
      </div>

      <div className="game-card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Rank', 'Player', 'Wins', 'Matches', 'Win Rate', 'Coins'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {players.map(p => {
                const isMe = p._id?.toString() === user?._id?.toString();
                return (
                  <tr key={p._id} className={`hover:bg-white/5 transition-colors ${isMe ? 'bg-purple-500/5' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center w-8">{rankIcon(p.rank)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar username={p.username} size="sm" />
                        <div>
                          <p className={`text-sm font-medium ${isMe ? 'text-purple-400' : 'text-white'}`}>
                            {p.username} {isMe && '(you)'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">{p.totalWins}</td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{p.totalMatches}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                            style={{ width: `${p.winRate}%` }}
                          />
                        </div>
                        <span className="text-slate-300 text-sm">{p.winRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-yellow-400 text-sm font-medium">{p.walletBalance?.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && players.length === 0 && (
          <div className="p-12 text-center text-slate-500">No players yet. Be the first!</div>
        )}
      </div>
    </div>
  );
}
