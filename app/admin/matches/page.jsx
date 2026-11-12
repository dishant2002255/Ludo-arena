'use client';
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Gamepad2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMatch, setEditMatch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', entryCoins: 0, winnerReward: 300,
  });

  useEffect(() => { fetchMatches(); }, []);

  const fetchMatches = async () => {
    try {
      const { data } = await api.get('/admin/matches');
      setMatches(data.data.matches || []);
    } catch { toast.error('Failed to load matches'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditMatch(null);
    setForm({ name: '', description: '', entryCoins: 0, winnerReward: 300 });
    setModalOpen(true);
  };

  const openEdit = (match) => {
    setEditMatch(match);
    setForm({ name: match.name, description: match.description || '', entryCoins: match.entryCoins, winnerReward: match.winnerReward });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editMatch) {
        await api.patch(`/admin/matches/${editMatch._id}`, form);
        toast.success('Match updated');
      } else {
        await api.post('/admin/matches', form);
        toast.success('Match created');
      }
      setModalOpen(false);
      fetchMatches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDisable = async (id) => {
    if (!confirm('Disable this match?')) return;
    try {
      await api.delete(`/admin/matches/${id}`);
      toast.success('Match disabled');
      fetchMatches();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Matches</h1>
          <p className="text-slate-400 mt-1">Manage match configurations</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={openCreate}>Create Match</Button>
      </div>

      <div className="game-card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Name', 'Entry', 'Reward', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {matches.map(m => (
                <tr key={m._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{m.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{m.description}</p>
                  </td>
                  <td className="px-6 py-4 text-white text-sm">
                    {m.entryCoins === 0 ? <span className="badge-green">Free</span> : `${m.entryCoins} coins`}
                  </td>
                  <td className="px-6 py-4 text-emerald-400 font-semibold text-sm">{m.winnerReward} coins</td>
                  <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(m)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDisable(m._id)} className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && matches.length === 0 && (
          <div className="p-12 text-center text-slate-500">No matches. Create one!</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editMatch ? 'Edit Match' : 'Create Match'}>
        <div className="p-6 space-y-5">
          <Input label="Match Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Classic Arena" />
          <Input label="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Entry Coins" type="number" value={form.entryCoins} onChange={e => setForm({...form, entryCoins: parseInt(e.target.value) || 0})} min="0" />
            <Input label="Winner Reward" type="number" value={form.winnerReward} onChange={e => setForm({...form, winnerReward: parseInt(e.target.value) || 0})} min="0" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editMatch ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
