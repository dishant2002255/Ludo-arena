'use client';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow } from 'date-fns';

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchRooms(); }, [filter]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/rooms', { params: { status: filter || undefined } });
      setRooms(data.data || []);
    } catch { toast.error('Failed to load rooms'); }
    finally { setLoading(false); }
  };

  const statuses = ['', 'waiting', 'in_progress', 'completed', 'abandoned'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Rooms</h1>
          <p className="text-slate-400 mt-1">Monitor all game rooms</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={fetchRooms}>Refresh</Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
              ${filter === s ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
          >
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="game-card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Room ID', 'Match', 'Players', 'Status', 'Created'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rooms.map(r => (
                <tr key={r._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <code className="text-purple-400 text-sm font-mono bg-purple-500/10 px-2 py-0.5 rounded">{r.roomId}</code>
                  </td>
                  <td className="px-6 py-4 text-white text-sm">{r.match?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {r.players?.map(p => (
                        <span key={p._id} className={`text-xs px-2 py-0.5 rounded-full
                          ${p.color === 'red' ? 'bg-red-500/20 text-red-400' :
                            p.color === 'green' ? 'bg-emerald-500/20 text-emerald-400' :
                            p.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'}`}>
                          {p.user?.username || p.color}
                        </span>
                      ))}
                      {Array.from({ length: 4 - (r.players?.length || 0) }).map((_, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-600">Empty</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && rooms.length === 0 && (
          <div className="p-12 text-center text-slate-500">No rooms found</div>
        )}
      </div>
    </div>
  );
}
