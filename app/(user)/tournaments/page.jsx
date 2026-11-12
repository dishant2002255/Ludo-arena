'use client';
import { useEffect, useState } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import TournamentCard from '@/components/tournament/TournamentCard';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import Button from '@/components/ui/Button';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';

const TABS = [
  { key: '',           label: 'All' },
  { key: 'open',       label: 'Open' },
  { key: 'room_published', label: 'Room Ready' },
  { key: 'completed',  label: 'Completed' },
];

export default function TournamentsPage() {
  const { user } = useAuthStore();
  const [tournaments, setTournaments] = useState([]);
  const [myIds, setMyIds]             = useState(new Set());
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('');

  useEffect(() => { fetchAll(); }, [tab]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([
        api.get('/tournaments', { params: { status: tab || undefined, limit: 50 } }),
        api.get('/tournaments/my',  { params: { limit: 50 } }),
      ]);
      setTournaments(tRes.data.data || []);
      setMyIds(new Set((mRes.data.data || []).map(t => t._id)));
    } catch {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Tournaments</h1>
          <p className="text-slate-400 mt-1">Join an admin-created tournament and compete</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={fetchAll} size="sm">Refresh</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
              ${tab === t.key ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="game-card p-16 text-center">
          <Trophy size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No tournaments available right now</p>
          <p className="text-slate-500 text-sm mt-1">Check back soon — admin will post new tournaments</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tournaments.map((t, i) => (
            <TournamentCard key={t._id} tournament={t} isJoined={myIds.has(t._id)} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
