'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Swords, Plus, Users, Coins, Timer, RefreshCw, Gamepad2, Eye, DoorOpen, LogOut, CircleDot,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { connectSocket } from '@/lib/socket/socket';
import { formatDistanceToNow } from 'date-fns';

const STATUS_BADGE = {
  open:           { label: 'Open',           badge: 'green'  },
  in_progress:    { label: 'In Progress',    badge: 'purple' },
  result_pending: { label: 'Result Pending', badge: 'yellow' },
  disputed:       { label: 'Disputed',       badge: 'red'    },
  completed:      { label: 'Completed',      badge: 'blue'   },
  cancelled:      { label: 'Cancelled',      badge: 'gray'   },
};

const MODE_LABEL = { classic: 'Classic', quick: 'Quick', one_kill: 'One Kill', popular: 'Popular' };

function BattlesLobby() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuthStore();
  const [subAdmins, setSubAdmins]   = useState([]);   // active w/ UPI
  const [subWallets, setSubWallets] = useState([]);
  const [subAdminId, setSubAdminId] = useState(searchParams.get('subAdminId') || '');
  const [battles, setBattles]      = useState([]);
  const [myBattles, setMyBattles]  = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('lobby'); // lobby | mine
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating]    = useState(false);
  const [joiningId, setJoiningId]  = useState(null);
  const [form, setForm]             = useState({
    gameMode: 'classic', maxPlayers: 2, entryCoins: 100, roomId: '', roomPassword: '',
  });

  const fetchSubAdmins = useCallback(async () => {
    try {
      const [sa, sw] = await Promise.all([
        api.get('/wallet/sub-admins'),
        api.get('/wallet/my-sub-wallets'),
      ]);
      setSubAdmins(sa.data.data || []);
      setSubWallets(sw.data.data || []);
      const urlId = searchParams.get('subAdminId');
      if (urlId) setSubAdminId(urlId);
    } catch {
      toast.error('Failed to load Sub-Admins');
    }
  }, [searchParams]);

  const fetchBattles = useCallback(async () => {
    if (!subAdminId) { setBattles([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [l, m] = await Promise.all([
        api.get(`/battles?subAdminId=${subAdminId}&limit=50`),
        api.get('/battles/mine?limit=50'),
      ]);
      setBattles(l.data.data || []);
      setMyBattles(m.data.data || []);
    } catch {
      toast.error('Failed to load battles');
    } finally {
      setLoading(false);
    }
  }, [subAdminId]);

  useEffect(() => { fetchSubAdmins(); }, [fetchSubAdmins]);
  useEffect(() => { fetchBattles(); }, [fetchBattles]);

  // Real-time lobby updates
  useEffect(() => {
    if (!subAdminId) return;
    const socket = connectSocket();
    socket.emit('lobby:subscribe', { subAdminId });
    const refresh = () => fetchBattles();
    socket.on('battle:created', refresh);
    socket.on('battle:updated', refresh);
    socket.on('battle:completed', refresh);
    socket.on('battle:cancelled', refresh);
    return () => {
      socket.emit('lobby:unsubscribe', { subAdminId });
      socket.off('battle:created', refresh);
      socket.off('battle:updated', refresh);
      socket.off('battle:completed', refresh);
      socket.off('battle:cancelled', refresh);
    };
  }, [subAdminId, fetchBattles]);

  const myWallet = subWallets.find((w) => w.subAdminId === subAdminId);
  const activeSubAdmin = subAdmins.find((s) => s._id === subAdminId);

  const createBattle = async () => {
    if (String(form.roomId).trim().length < 3) {
      toast.error('Enter the Ludo King room ID you created');
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/battles', { subAdminId, ...form });
      toast.success(data.message);
      setCreateModal(false);
      setForm({ gameMode: 'classic', maxPlayers: 2, entryCoins: 100, roomId: '', roomPassword: '' });
      fetchBattles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create battle');
    } finally {
      setCreating(false);
    }
  };

  const joinBattle = async (battleId) => {
    setJoiningId(battleId);
    try {
      const { data } = await api.post(`/battles/${battleId}/join`);
      if (data.data.roomId) {
        toast.success('Battle is full! Opening room credentials…');
        window.location.href = `/battles/${battleId}`;
      } else {
        toast.success(data.message);
      }
      await refreshUser();
      fetchBattles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    } finally {
      setJoiningId(null);
    }
  };

  const leaveBattle = async (battleId) => {
    try {
      await api.post(`/battles/${battleId}/leave`);
      toast.success('Left battle — entry refunded');
      await refreshUser();
      fetchBattles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave');
    }
  };

  const visibleBattles = battles.filter(
    (b) => !myBattles.some((m) => m._id === b._id) || b.status === 'open'
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
            <Swords size={28} className="text-purple-400" /> Open Battles
          </h1>
          <p className="text-slate-400 mt-1">Ludo King challenges — 1 coin = ₹1</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setCreateModal(true)}
          disabled={!subAdminId} size="sm">
          Create Battle
        </Button>
      </div>

      {/* Sub-Admin selector + wallet info */}
      <div className="game-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Play under</label>
            <select
              className="input-field"
              value={subAdminId}
              onChange={(e) => setSubAdminId(e.target.value)}
            >
              <option value="">Select a Sub-Admin…</option>
              {subAdmins.map((sa) => (
                <option key={sa._id} value={sa._id}>{sa.displayName}</option>
              ))}
            </select>
          </div>
          {myWallet && (
            <div className="sm:w-64 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-xs text-slate-400">Your coins under {myWallet.subAdminName}</p>
              <p className="text-lg font-bold text-yellow-400">{myWallet.balance.toLocaleString()} <span className="text-xs">coins</span></p>
              <Link href="/buy-coins" className="text-xs text-purple-400 hover:underline">Buy more →</Link>
            </div>
          )}
        </div>
        {subAdminId && !myWallet && (
          <p className="text-xs text-amber-400">
            You have no coins under this Sub-Admin yet — buy coins to join battles.{' '}
            <Link href="/buy-coins" className="underline">Buy coins →</Link>
          </p>
        )}
        {activeSubAdmin?.commissionPercent != null && (
          <p className="text-xs text-slate-500">
            Battle commission under this Sub-Admin: {activeSubAdmin.commissionPercent}%
          </p>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {[['lobby', 'Lobby'], ['mine', 'My Battles']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all
              ${tab === key ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
        <button onClick={fetchBattles} className="ml-auto px-3 py-2 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Lobby list */}
      {tab === 'lobby' && (
        !subAdminId ? (
          <div className="game-card p-12 text-center text-slate-400">
            <Gamepad2 size={40} className="mx-auto mb-3 text-slate-600" />
            Select a Sub-Admin above to view their battles
          </div>
        ) : loading ? <TableSkeleton /> : visibleBattles.length === 0 ? (
          <div className="game-card p-12 text-center text-slate-400">
            <Swords size={40} className="mx-auto mb-3 text-slate-600" />
            No battles yet under this Sub-Admin. Create the first one!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleBattles.map((b) => {
              const joined = myBattles.some((m) => m._id === b._id);
              const st = STATUS_BADGE[b.status] || STATUS_BADGE.open;
              return (
                <motion.div key={b._id} layout className="game-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-slate-500">{b.battleCode}</span>
                    <Badge variant={st.badge}>{st.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-500">Entry</p>
                      <p className="text-yellow-400 font-bold flex items-center gap-1"><Coins size={14} />{b.entryCoins}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-500">Prize pool</p>
                      <p className="text-emerald-400 font-bold">{b.winningPrize}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-500">Mode</p>
                      <p className="text-slate-300 font-semibold">{MODE_LABEL[b.gameMode] || b.gameMode}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-500">Players</p>
                      <p className="text-slate-300 font-semibold flex items-center gap-1">
                        <Users size={14} />{b.participants.length}/{b.maxPlayers}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 flex items-center gap-1">
                    <Timer size={12} /> Created {b.createdAt ? formatDistanceToNow(new Date(b.createdAt), { addSuffix: true }) : ''}
                  </p>
                  <div className="flex gap-2">
                    {joined ? (
                      <>
                        <Link href={`/battles/${b._id}`} className="flex-1">
                          <Button fullWidth size="sm" icon={<Eye size={14} />}>Open</Button>
                        </Link>
                        {b.status === 'open' && (
                          <Button size="sm" variant="secondary" icon={<LogOut size={14} />} onClick={() => leaveBattle(b._id)}>
                            Leave
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        fullWidth size="sm" variant="success"
                        icon={<DoorOpen size={14} />}
                        disabled={b.status !== 'open' || b.participants.length >= b.maxPlayers}
                        loading={joiningId === b._id}
                        onClick={() => joinBattle(b._id)}
                      >
                        Join ({b.entryCoins} coins)
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* My battles */}
      {tab === 'mine' && (
        loading ? <TableSkeleton /> : myBattles.length === 0 ? (
          <div className="game-card p-12 text-center text-slate-400">
            <CircleDot size={40} className="mx-auto mb-3 text-slate-600" />
            You haven't joined any battles yet
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myBattles.map((b) => {
              const st = STATUS_BADGE[b.status] || STATUS_BADGE.open;
              return (
                <div key={b._id} className="game-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-slate-500">{b.battleCode}</span>
                    <Badge variant={st.badge}>{st.label}</Badge>
                  </div>
                  <p className="text-sm text-slate-300 mb-1">Entry {b.entryCoins} · Prize {b.winningPrize}</p>
                  <p className="text-xs text-slate-500 mb-3">{b.participants.length}/{b.maxPlayers} players</p>
                  <Link href={`/battles/${b._id}`}>
                    <Button fullWidth size="sm" icon={<Eye size={14} />}>Open Battle</Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Create battle modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Open Battle">
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            Create the room in your Ludo King app first, then enter its Room ID and password here.
            Other players will see the credentials only once the battle fills up.
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Game mode</label>
            <div className="grid grid-cols-4 gap-2">
              {['classic', 'quick', 'one_kill', 'popular'].map((m) => (
                <button key={m} onClick={() => setForm({ ...form, gameMode: m })}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all
                    ${form.gameMode === m ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Players</label>
            <div className="grid grid-cols-2 gap-2">
              {[2, 4].map((n) => (
                <button key={n} onClick={() => setForm({ ...form, maxPlayers: n })}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all
                    ${form.maxPlayers === n ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {n} players · pot {(form.entryCoins * n).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Entry coins (₹1 per coin)"
            type="number"
            min={50}
            value={form.entryCoins}
            onChange={(e) => setForm({ ...form, entryCoins: parseInt(e.target.value) || 0 })}
            hint={myWallet ? `Your available: ${myWallet.balance} coins` : ''}
          />

          <Input
            label="Ludo King Room ID *"
            placeholder="e.g. 48291037"
            value={form.roomId}
            onChange={(e) => setForm({ ...form, roomId: e.target.value })}
          />
          <Input
            label="Ludo King Room password"
            placeholder="optional"
            value={form.roomPassword}
            onChange={(e) => setForm({ ...form, roomPassword: e.target.value })}
          />

          <div className="game-card p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total pot</span>
              <span className="text-white font-bold">{(form.entryCoins * form.maxPlayers).toLocaleString()} coins</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Winner prize (after commission)</span>
              <span className="text-emerald-400 font-bold">
                {Math.floor(form.entryCoins * form.maxPlayers * (1 - (activeSubAdmin?.commissionPercent ?? 5) / 100)).toLocaleString()} coins
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button loading={creating} onClick={createBattle}
              disabled={!form.roomId || form.entryCoins < 50}>
              <Swords size={16} /> Create & Join
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function BattlesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <BattlesLobby />
    </Suspense>
  );
}
