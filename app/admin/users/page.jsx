'use client';
import { useEffect, useState } from 'react';
import { Search, Shield, ShieldOff } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  useEffect(() => { fetchUsers(); }, [search]);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { search, page, limit: 20 } });
      setUsers(data.data || []);
      setPagination(data.pagination || { page: 1, pages: 1 });
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const toggleBlock = async (userId, isBlocked) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-block`);
      toast.success(`User ${isBlocked ? 'unblocked' : 'blocked'}`);
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Users</h1>
        <p className="text-slate-400 mt-1">Manage registered users</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <Input placeholder="Search by name or email..." icon={<Search size={16} />} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="game-card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['User', 'Email', 'Balance', 'Wins', 'Matches', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar username={u.username} size="sm" />
                      <p className="text-white text-sm font-medium">{u.username}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-400 text-sm">{u.email}</td>
                  <td className="px-4 py-4 text-yellow-400 font-semibold text-sm">{u.walletBalance?.toLocaleString()}</td>
                  <td className="px-4 py-4 text-emerald-400 text-sm">{u.totalWins}</td>
                  <td className="px-4 py-4 text-slate-300 text-sm">{u.totalMatches}</td>
                  <td className="px-4 py-4">
                    <Badge variant={u.isBlocked ? 'red' : 'green'} dot>
                      {u.isBlocked ? 'Blocked' : 'Active'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleBlock(u._id, u.isBlocked)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all
                        ${u.isBlocked
                          ? 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                          : 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                        }`}
                    >
                      {u.isBlocked ? <><Shield size={12} /> Unblock</> : <><ShieldOff size={12} /> Block</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && users.length === 0 && (
          <div className="p-12 text-center text-slate-500">No users found</div>
        )}
      </div>
    </div>
  );
}
