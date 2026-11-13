'use client';
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Bell, Gamepad2, Users } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';
import { connectSocket } from '@/lib/socket/socket';
import { formatDistanceToNow } from 'date-fns';

export default function AdminRoomsPage() {
  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  // Rooms ready alert (4 players joined, waiting for Ludo King room ID)
  const [readyAlerts, setReadyAlerts] = useState({}); // { roomId: data }

  // Publish modal
  const [publishModal, setPublishModal] = useState(null); // { roomId, roomData }
  const [publishForm, setPublishForm]   = useState({ externalRoomId: '', externalRoomPassword: '' });
  const [publishing, setPublishing]     = useState(false);

  useEffect(() => {
    fetchRooms();

    // Listen for real-time "players ready" alerts
    const socket = connectSocket();
    socket.on('room:players-ready', (data) => {
      setReadyAlerts(prev => ({ ...prev, [data.roomId]: data }));
      toast.warning(`🎮 ${data.matchName}: 4 players ready! Share Ludo King Room ID.`);
      fetchRooms();
    });

    return () => socket.off('room:players-ready');
  }, []);

  useEffect(() => { fetchRooms(); }, [filter]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/rooms', { params: { status: filter || undefined } });
      setRooms(data.data || []);
    } catch { toast.error('Failed to load rooms'); }
    finally { setLoading(false); }
  };

  const openPublish = (room) => {
    setPublishForm({
      externalRoomId: room.externalRoomId || '',
      externalRoomPassword: room.externalRoomPassword || '',
    });
    setPublishModal(room);
  };

  const handlePublish = async () => {
    if (!publishForm.externalRoomId.trim()) {
      toast.error('Room ID is required');
      return;
    }
    setPublishing(true);
    try {
      await api.post(`/admin/rooms/${publishModal.roomId}/publish-credentials`, publishForm);
      toast.success('Room credentials published to all 4 players!');
      setPublishModal(null);
      // Clear ready alert for this room
      setReadyAlerts(prev => { const n = {...prev}; delete n[publishModal.roomId]; return n; });
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setPublishing(false);
    }
  };

  const statuses = ['', 'waiting', 'full', 'in_progress', 'completed', 'abandoned'];
  const hasAlerts = Object.keys(readyAlerts).length > 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Ready Alerts ── */}
      <AnimatePresence>
        {hasAlerts && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="p-4 rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10 space-y-3"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [-8, 8, -8, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Bell size={20} className="text-yellow-400" />
              </motion.div>
              <p className="text-yellow-300 font-bold text-sm">
                🎮 {Object.keys(readyAlerts).length} Room{Object.keys(readyAlerts).length > 1 ? 's' : ''} waiting — 4 players ready!
              </p>
            </div>
            <div className="space-y-2">
              {Object.values(readyAlerts).map(alert => (
                <div key={alert.roomId} className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white text-sm font-medium">{alert.matchName}</p>
                    <div className="flex gap-1 mt-1">
                      {alert.players?.map((p, i) => (
                        <span key={i} className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">{p.username}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const r = rooms.find(r => r.roomId === alert.roomId);
                      if (r) openPublish(r);
                      else {
                        // Create a minimal room object from alert data
                        openPublish({ roomId: alert.roomId, externalRoomId: '', externalRoomPassword: '' });
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/30 transition-all shrink-0"
                  >
                    Share Room ID →
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Rooms</h1>
          <p className="text-slate-400 mt-1">Monitor all Classic Play rooms</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={fetchRooms}>Refresh</Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize
              ${filter === s ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="game-card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Room ID', 'Match', 'Players', 'Ludo King ID', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rooms.map(r => {
                const isReady = r.status === 'full' || (r.status === 'waiting' && (r.players?.length || 0) >= 4);
                return (
                  <tr key={r._id} className={`hover:bg-white/5 transition-colors ${readyAlerts[r.roomId] ? 'bg-yellow-500/5' : ''}`}>
                    <td className="px-5 py-4">
                      <code className="text-purple-400 text-sm font-mono bg-purple-500/10 px-2 py-0.5 rounded">{r.roomId}</code>
                      {readyAlerts[r.roomId] && <Bell size={12} className="inline ml-1.5 text-yellow-400 animate-bounce" />}
                    </td>
                    <td className="px-5 py-4 text-white text-sm">{r.match?.name || '—'}</td>
                    <td className="px-5 py-4">
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
                    <td className="px-5 py-4">
                      {r.externalRoomId ? (
                        <code className="text-emerald-400 text-sm font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                          {r.externalRoomId}
                        </code>
                      ) : (
                        <span className="text-slate-600 text-xs">Not set</span>
                      )}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-4">
                      {(r.status === 'full' || isReady) && (
                        <button
                          onClick={() => openPublish(r)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                            ${r.externalRoomId
                              ? 'text-purple-400 border-purple-500/30 hover:bg-purple-500/10'
                              : 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20'}`}
                        >
                          {r.externalRoomId ? '✏️ Update Room ID' : '🎮 Share Room ID'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && rooms.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
            No rooms found
          </div>
        )}
      </div>

      {/* ── Publish Room ID Modal ── */}
      <Modal isOpen={!!publishModal} onClose={() => setPublishModal(null)} title="🎮 Share Ludo King Room ID" size="sm">
        {publishModal && (
          <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">

            {/* Instructions */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-1.5">
              <p className="font-semibold text-purple-100">Before filling this form:</p>
              <p>1. Open <strong>Ludo King</strong> on your phone</p>
              <p>2. Tap <strong>Play Online → Private Room → Create Room</strong></p>
              <p>3. Set to <strong>4 Players</strong> and copy the <strong>Room ID + Password</strong></p>
              <p>4. Enter them below and click Publish</p>
              <p>5. All 4 players will receive them <strong>instantly</strong></p>
            </div>

            <div className="text-xs text-slate-500">
              Room: <code className="text-purple-400">{publishModal.roomId}</code>
            </div>

            <Input
              label="Ludo King Room ID *"
              value={publishForm.externalRoomId}
              onChange={e => setPublishForm(f => ({ ...f, externalRoomId: e.target.value }))}
              placeholder="e.g. 123456"
            />

            <Input
              label="Room Password (if set)"
              value={publishForm.externalRoomPassword}
              onChange={e => setPublishForm(f => ({ ...f, externalRoomPassword: e.target.value }))}
              placeholder="Leave blank if no password"
            />

            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
              ⚠ Room ID and password will be shown ONLY to the 4 players in this room.
            </div>

            <div className="flex justify-end gap-3 pb-1">
              <Button variant="secondary" onClick={() => setPublishModal(null)}>Cancel</Button>
              <Button loading={publishing} variant="success" onClick={handlePublish}>
                Publish to Players
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
