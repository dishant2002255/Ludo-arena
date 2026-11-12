'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Eye, Trophy, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow } from 'date-fns';

const STATUS_FILTERS = ['','draft','open','full','waiting_for_admin','room_published','result_pending','completed','cancelled'];

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [bannerFile, setBannerFile]   = useState(null);
  const [form, setForm] = useState({ title:'', description:'', rules:'', winnerReward:0 });

  useEffect(() => { fetchTournaments(); }, [filter]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tournaments/admin/all', { params: { status: filter || undefined } });
      setTournaments(data.data || []);
    } catch { toast.error('Failed to load tournaments'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setCreating(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      if (bannerFile) fd.append('banner', bannerFile);
      await api.post('/tournaments/admin/create', fd, { headers: {'Content-Type':'multipart/form-data'} });
      toast.success('Tournament created!');
      setCreateModal(false);
      setForm({ title:'', description:'', rules:'', winnerReward:0 });
      setBannerFile(null);
      fetchTournaments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Tournaments</h1>
          <p className="text-slate-400 mt-1">Manage all tournaments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16}/>} onClick={fetchTournaments} size="sm">Refresh</Button>
          <Button icon={<Plus size={18}/>} onClick={() => setCreateModal(true)}>Create Tournament</Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-all
              ${filter===s ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="game-card overflow-hidden">
        {loading ? <TableSkeleton /> : tournaments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Trophy size={40} className="mx-auto mb-3 opacity-30" />
            No tournaments found. Create one!
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Tournament','Players','Status','Reward','Created','Actions'].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tournaments.map(t => (
                <tr key={t._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {t.bannerUrl ? (
                        <img src={t.bannerUrl} alt="" className="w-10 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-8 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <Trophy size={14} className="text-purple-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium line-clamp-1">{t.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{t.description || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                      <Users size={13} />
                      {t.participants?.length||0}/{t.requiredPlayers}
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={t.status} /></td>
                  <td className="px-5 py-4 text-yellow-400 text-sm font-semibold">
                    {t.winnerReward > 0 ? `${t.winnerReward} coins` : '—'}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {t.createdAt ? formatDistanceToNow(new Date(t.createdAt),{addSuffix:true}) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/admin/tournaments/${t._id}`}>
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-all">
                        <Eye size={13} /> Manage
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Tournament">
        <div className="p-6 space-y-5">
          <Input label="Title *" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Weekend Ludo Championship" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Tournament description..."
              value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Rules</label>
            <textarea className="input-field resize-none" rows={4} placeholder="Tournament rules and instructions..."
              value={form.rules} onChange={e=>setForm({...form,rules:e.target.value})} />
          </div>
          <Input label="Winner Reward (coins)" type="number" min={0} value={form.winnerReward}
            onChange={e=>setForm({...form,winnerReward:parseInt(e.target.value)||0})} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Banner Image (optional)</label>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" className="input-field py-2 cursor-pointer"
              onChange={e => setBannerFile(e.target.files[0]||null)} />
            {bannerFile && <p className="text-xs text-emerald-400">Selected: {bannerFile.name}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button loading={creating} onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
