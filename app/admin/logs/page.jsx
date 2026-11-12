'use client';
import { useEffect, useState } from 'react';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow } from 'date-fns';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/admin/logs');
      setLogs(data.data || []);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Audit Logs</h1>
        <p className="text-slate-400 mt-1">All admin actions are recorded here</p>
      </div>

      <div className="game-card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Admin', 'Action', 'Target', 'Time'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map(l => (
                <tr key={l._id} className="hover:bg-white/2">
                  <td className="px-6 py-4 text-white text-sm">{l.admin?.username || '—'}</td>
                  <td className="px-6 py-4">
                    <code className="text-purple-400 text-xs bg-purple-500/10 px-2 py-1 rounded">{l.action}</code>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm capitalize">{l.targetType || '—'}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {l.createdAt ? formatDistanceToNow(new Date(l.createdAt), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && logs.length === 0 && (
          <div className="p-12 text-center text-slate-500">No logs yet</div>
        )}
      </div>
    </div>
  );
}
