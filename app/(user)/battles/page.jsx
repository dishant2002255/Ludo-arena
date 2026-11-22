'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Swords, Plus, Users, Coins, Timer, RefreshCw, Eye, DoorOpen, LogOut, CircleDot, Filter,
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

const MODE_LABEL = { classic: 'Classic', quick: 'Quick', one_kill: '1 Kill', popular: 'Popular' };

function BattlesLobby() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuthStore();

  const [subAdmins, setSubAdmins]     = useState([]);
  const [subWallets, setSubWallets]   = useState([]);
  // '' means "show all", a specific ID filters to that sub-admin
  const [subAdminId, setSubAdminId]   = useState(searchParams.get('subAdminId') || '');

  const [allBattles, setAllBattles]   = useState([]);   // all running battles from API
  const [myBattles, setMyBattles]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('lobby'); // lobby | mine
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [joiningId, setJoiningId]     = useState(null);
  const [form, setForm]               = useState({
    gameMode: 'classic', maxPlayers: 2, entryCoins: 100, roomId: '', roomPassword: '',
  });

  // ── Fetch sub-admins + wallets once ────────────────────────────────────────
  const fetchSubAdmins = useCallback(async () => {
    try {
      const [sa, sw] = await Promise.all([
        api.get('/wallet/sub-admins'),
        api.get('/wallet/my-sub-wallets'),
      ]);
      setSubAdmins(sa.data.data || []);
      setSubWallets(sw.data.data || []);
    } catch {
      toast.error('Failed to load Sub-Admins');
    }
  }, []);

  // ── Fetch ALL active battles (no subAdminId filter by default) ─────────────
  const fetchBattles = useCallback(async () => {
    setLoading(true);
    try {
      // Build query — if subAdminId chosen, filter; otherwise get all
      const query = subAdminId
        ? `/battles?subAdminId=${subAdminId}&limit=50`
        : `/battles?limit=50`;

      const [l, m] = await Promise.all([
        api.get(query),
        api.get('/battles/mine?limit=50'),
      ]);
      setAllBattles(l.data.data || []);
      setMyBattles(m.data.data || []);
    } catch {
      toast.error('Failed to load battles');
    } finally {
      setLoading(false);
    }
  }, [subAdminId]);

  useEffect(() => { fetchSubAdmins(); }, [fetchSubAdmins]);
  useEffect(() => { fetchBattles(); }, [fetchBattles]);

  // ── Real-time socket updates ───────────────────────────────────────────────
  useEffect(() => {
    const socket = connectSocket();
    const refresh = () => fetchBattles();

    if (subAdminId) {
      // Subscribed scope — targeted updates
      socket.emit('lobby:subscribe', { subAdminId });
      socket.on('battle:created',   refresh);
      socket.on('battle:updated',   refresh);
      socket.on('battle:completed', refresh);
      socket.on('battle:cancelled', refresh);
      return () => {
        socket.emit('lobby:unsubscribe', { subAdminId });
        socket.off('battle:created',   refresh);
        socket.off('battle:updated',   refresh);
        socket.off('battle:completed', refresh);
        socket.off('battle:cancelled', refresh);
      };
    } else {
      // No filter — poll every 15s for all battles (socket rooms are per sub-admin)
      const poll = setInterval(refresh, 15000);
      return () => clearInterval(poll);
    }
  }, [subAdminId, fetchBattles]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const myWallet       = subWallets.find((w) => w.subAdminId === subAdminId);
  const activeSubAdmin = subAdmins.find((s) => s._id === subAdminId);

  // Lobby: all battles except ones I'm already in (those show in Mine tab)
  const lobbyBattles = allBattles.filter(
    (b) => !myBattles.some((m) => m._id === b._id)
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const createBattle = async () => {
    if (!subAdminId) {
      toast.error('Select a Sub-Admin to create a battle under');
      return;
    }
    if (String(form.roomId).trim().length < 3) {
      toast.error('Enter the Ludo King room ID you created (min 3 chars)');
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
      if (data.data?.roomId) {
        toast.success('Battle is full! Opening room credentials…');
        window.location.href = `/battles/${battleId}`;
        return;
      }
      toast.success(data.message);
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

  // ── Render ─────────────────────────────────────────────────────────────────
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
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchBattles}>
            Refresh
          </Button>
          <Button icon={<Plus size={18} />} size="sm" onClick={() => setCreateModal(true)}>
            Create Battle
          </Button>
        </div>
      </div>

      {/* Sub-Admin filter bar — optional, shows all by default */}
      <div className="game-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={15} className="text-slate-500" />
          <span className="text-sm text-slate-400">Filter by Sub-Admin:</span>
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
          {/* "All" pill */}
          <button
            onClick={() => setSubAdminId('')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              subAdminId === ''
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'border-white/10 text-slate-400 hover:bg-white/5'
            }`}
          >
            🌐 All
          </button>

          {subAdmins.map((sa) => (
            <button
              key={sa._id}
              onClick={() => setSubAdminId(sa._id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                subAdminId === sa._id
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'border-white/10 text-slate-400 hover:bg-white/5'
              }`}
            >
              {sa.displayName}
            </button>
          ))}
        </div>

        {/* Wallet info when a sub-admin is selected */}
        {subAdminId && myWallet && (
          <div className="shrink-0 px-3 py-2 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-sm">
            <span className="text-slate-400">Your coins: </span>
            <span className="text-yellow-400 font-bold">{myWallet.balance.toLocaleString()}</span>
            <Link href="/buy-coins" className="ml-2 text-xs text-purple-400 hover:underline">Top up →</Link>
          </div>
        )}
        {subAdminId && !myWallet && (
          <p className="shrink-0 text-xs text-amber-400">
            No coins under this Sub-Admin.{' '}
            <Link href="/buy-coins" className="underline">Buy coins →</Link>
          </p>
        )}
      </div>

      {/* Commission info */}
      {activeSubAdmin?.commissionPercent != null && (
        <p className="text-xs text-slate-500 px-1">
          Commission under {activeSubAdmin.displayName}: {activeSubAdmin.commissionPercent}%
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[['lobby', `Lobby (${lobbyBattles.length})`], ['mine', `My Battles (${myBattles.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all
              ${tab === key ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LOBBY TAB ──────────────────────────────────────────────────────── */}
      {tab === 'lobby' && (
        loading ? <TableSkeleton /> :
        lobbyBattles.length === 0 ? (
          <div className="game-card p-12 text-center text-slate-400">
            <Swords size={40} className="mx-auto mb-3 text-slate-600" />
            <p>{subAdminId ? 'No battles under this Sub-Admin yet.' : 'No active battles right now.'}</p>
            <p className="text-sm mt-1">Create the first one!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lobbyBattles.map((b) => {
              const st = STATUS_BADGE[b.status] || STATUS_BADGE.open;
              const isFull = b.participants.length >= b.maxPlayers;
              return (
                <motion.div key={b._id} layout className="game-card p-5">
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-mono text-xs text-slate-500">{b.battleCode}</span>
                      {b.subAdmin?.subAdminInfo?.displayName && (
                        <p className="text-xs text-slate-600 mt-0.5">{b.subAdmin.subAdminInfo.displayName}</p>
                      )}
                    </div>
                    <Badge variant={st.badge}>{st.label}</Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-500">Entry</p>
                      <p className="text-yellow-400 font-bold flex items-center gap-1">
                        <Coins size={13} />₹{b.entryCoins}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-500">Win prize</p>
                      <p className="text-emerald-400 font-bold">₹{b.winningPrize}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-500">Mode</p>
                      <p className="text-slate-300 font-semibold">{MODE_LABEL[b.gameMode] || b.gameMode}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-500">Players</p>
                      <p className={`font-semibold flex items-center gap-1 ${isFull ? 'text-red-400' : 'text-slate-300'}`}>
                        <Users size={13} />{b.participants.length}/{b.maxPlayers}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 flex items-center gap-1">
                    <Timer size={11} />
                    {b.createdAt ? formatDistanceToNow(new Date(b.createdAt), { addSuffix: true }) : ''}
                  </p>

                  {/* Join button */}
                  <Button
                    fullWidth size="sm" variant="success"
                    icon={<DoorOpen size={14} />}
                    disabled={b.status !== 'open' || isFull}
                    loading={joiningId === b._id}
                    onClick={() => joinBattle(b._id)}
                  >
                    {b.status !== 'open'
                      ? st.label
                      : isFull
                      ? 'Battle Full'
                      : `Join — ₹${b.entryCoins}`}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* ── MY BATTLES TAB ─────────────────────────────────────────────────── */}
      {tab === 'mine' && (
        loading ? <TableSkeleton /> :
        myBattles.length === 0 ? (
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
                    <div>
                      <span className="font-mono text-xs text-slate-500">{b.battleCode}</span>
                      {b.subAdmin?.subAdminInfo?.displayName && (
                        <p className="text-xs text-slate-600 mt-0.5">{b.subAdmin.subAdminInfo.displayName}</p>
                      )}
                    </div>
                    <Badge variant={st.badge}>{st.label}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-slate-500">Entry</p>
                      <p className="text-yellow-400 font-bold">₹{b.entryCoins}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-slate-500">Prize</p>
                      <p className="text-emerald-400 font-bold">₹{b.winningPrize}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-slate-500">Players</p>
                      <p className="text-slate-300 font-bold">{b.participants.length}/{b.maxPlayers}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/battles/${b._id}`} className="flex-1">
                      <Button fullWidth size="sm" icon={<Eye size={14} />}>Open</Button>
                    </Link>
                    {b.status === 'open' && (
                      <Button size="sm" variant="secondary" icon={<LogOut size={14} />}
                        onClick={() => leaveBattle(b._id)}>
                        Leave
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── CREATE BATTLE MODAL ────────────────────────────────────────────── */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Open Battle">
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            Create the room in your Ludo King app first, then enter its Room ID here.
            Room credentials are hidden from others until the battle fills up.
          </div>

          {/* Sub-admin selector inside modal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Battle under Sub-Admin *</label>
            <select
              className="input-field"
              value={subAdminId}
              onChange={(e) => setSubAdminId(e.target.value)}
            >
              <option value="">Select Sub-Admin…</option>
              {subAdmins.map((sa) => (
                <option key={sa._id} value={sa._id}>{sa.displayName}</option>
              ))}
            </select>
            {subAdminId && myWallet && (
              <p className="text-xs text-slate-500">
                Your coins: 🎮 Deposit ₹{myWallet.depositBalance || 0} · 🏆 Winning ₹{myWallet.winningBalance || 0}
              </p>
            )}
          </div>

          {/* Game mode */}
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

          {/* Players */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Players</label>
            <div className="grid grid-cols-2 gap-2">
              {[2, 4].map((n) => (
                <button key={n} onClick={() => setForm({ ...form, maxPlayers: n })}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all
                    ${form.maxPlayers === n ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {n} players · pot ₹{(form.entryCoins * n).toLocaleString()}
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
            hint={myWallet ? `Total playable: ₹${myWallet.balance}` : 'Select Sub-Admin to see balance'}
          />

          <Input
            label="Ludo King Room ID *"
            placeholder="e.g. 48291037"
            value={form.roomId}
            onChange={(e) => setForm({ ...form, roomId: e.target.value })}
          />
          <Input
            label="Room password (optional)"
            placeholder="Leave blank if none"
            value={form.roomPassword}
            onChange={(e) => setForm({ ...form, roomPassword: e.target.value })}
          />

          {/* Summary */}
          <div className="rounded-2xl p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/20 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Total pot</span>
              <span className="text-white font-bold">₹{(form.entryCoins * form.maxPlayers).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Winner prize</span>
              <span className="text-emerald-400 font-bold">
                ₹{Math.floor(form.entryCoins * form.maxPlayers * (1 - (activeSubAdmin?.commissionPercent ?? 5) / 100)).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Commission ({activeSubAdmin?.commissionPercent ?? 5}%)</span>
              <span className="text-slate-500">
                ₹{Math.ceil(form.entryCoins * form.maxPlayers * (activeSubAdmin?.commissionPercent ?? 5) / 100).toLocaleString()} burned
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button loading={creating} onClick={createBattle}
              disabled={!form.roomId || form.entryCoins < 50 || !subAdminId}>
              <Swords size={15} /> Create & Join
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
