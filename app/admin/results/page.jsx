'use client';
import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow } from 'date-fns';

export default function AdminResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = async () => {
    try {
      const { data } = await api.get('/admin/results');
      setResults(data.data || []);
    } catch { toast.error('Failed to load results'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Match Results</h1>
        <p className="text-slate-400 mt-1">Completed game history</p>
      </div>

      <div className="game-card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Match', 'Winner', 'Duration', 'Reward', 'Completed'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.map(r => (
                <tr key={r._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white text-sm font-medium">{r.match?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Trophy size={14} className="text-yellow-400" />
                      <Avatar username={r.winner?.username || 'Winner'} size="xs" />
                      <span className="text-sm text-white">{r.winner?.username || r.winnerColor || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {r.duration ? `${Math.floor(r.duration / 60)}m ${r.duration % 60}s` : '—'}
                  </td>
                  <td className="px-6 py-4 text-emerald-400 font-semibold text-sm">
                    {r.players?.find(p => p.user?.toString() === r.winner?._id?.toString())?.coinsEarned || 0} coins
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {r.completedAt ? formatDistanceToNow(new Date(r.completedAt), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && results.length === 0 && (
          <div className="p-12 text-center text-slate-500">No completed matches yet</div>
        )}
      </div>
    </div>
  );
}
