'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Swords, Plus, Users, Timer, Eye, LogOut, CircleDot, ChevronRight, X, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { connectSocket } from '@/lib/socket/socket';
import { formatDistanceToNow } from 'date-fns';

const STATUS_BADGE = {
  open:           { label: 'Open',           badge: 'green'  },
  in_progress:    { label: 'Live',           badge: 'red'    },
  result_pending: { label: 'Result Pending', badge: 'yellow' },
  disputed:       { label: 'Disputed',       badge: 'red'    },
  completed:      { label: 'Completed',      badge: 'blue'   },
  cancelled:      { label: 'Cancelled',      badge: 'gray'   },
};

const MODE_LABEL = { classic: 'Classic', quick: 'Quick', one_kill: '1 Kill', popular: 'Popular' };

// ── Open Battle card (AM2PM style green gradient) ─────────────────────────────
function OpenBattleCard({ battle, onJoin, joiningId }) {
  const isFull = battle.participants.length >= battle.maxPlayers;
  const creator = battle.creator?.username || 'Player';
  return (
    <div className="battle-card p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold" style={{ color: '#6b8f71' }}>Challenge From</p>
          <p className="font-black text-sm" style={{ color: '#1a3c24' }}>{creator}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold" style={{ color: '#6b8f71' }}>Prize</p>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: '#c9960a' }}>₹</span>
            <span className="font-black text-sm" style={{ color: '#0a7a3c' }}>{battle.winningPrize}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: '#6b8f71' }}>Entry Fee</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs font-bold" style={{ color: '#c9960a' }}>₹</span>
            <span className="text-xl font-black" style={{ color: '#1a3c24' }}>{battle.entryCoins}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: '#d0f0e0', color: '#0a7a3c', border: '1px solid #a8dfc0' }}>
            {MODE_LABEL[battle.gameMode] || battle.gameMode}
          </span>
          <button
            onClick={() => onJoin(battle._id)}
            disabled={isFull || battle.status !== 'open' || joiningId === battle._id}
            className="font-black text-sm px-6 py-2.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(to bottom, #2ecc71, #0a7a3c)',
              color: '#fff',
              boxShadow: '0 3px 10px rgba(10,122,60,0.3)',
            }}
          >
            {joiningId === battle._id ? '…' : isFull ? 'Full' : 'PLAY'}
          </button>
        </div>
      </div>

      <p className="text-xs mt-2" style={{ color: '#a0b8a4' }}>
        <Timer size={10} className="inline mr-1" />
        {battle.createdAt ? formatDistanceToNow(new Date(battle.createdAt), { addSuffix: true }) : ''}
        {' · '}{battle.participants.length}/{battle.maxPlayers} players
      </p>
    </div>
  );
}

// ── Running Battle card ────────────────────────────────────────────────────────
function RunningBattleCard({ battle, isMyBattle, onOpen, onLeave }) {
  const p0 = battle.participants?.[0];
  const p1 = battle.participants?.[1];
  const name0 = p0?.user?.username || '?';
  const name1 = p1?.user?.username || 'Waiting…';

  return (
    <div className="battle-card-running p-4 mb-3">
      <div className="flex items-center justify-between mb-2 text-xs font-bold" style={{ color: '#0a7a3c' }}>
        <span>PLAYING FOR : <span style={{ color: '#c9960a' }}>₹</span> {battle.entryCoins}</span>
        <span>PRIZE : <span style={{ color: '#c9960a' }}>₹</span> {battle.winningPrize}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs"
            style={{ background: '#c9960a', color: '#fff' }}>
            {name0.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-sm" style={{ color: '#1a3c24' }}>{name0}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#dcfce7', color: '#0a7a3c', border: '1px solid #a8dfc0' }}>
            {battle.status === 'in_progress' ? 'LIVE' : STATUS_BADGE[battle.status]?.label}
          </span>
          <Zap size={16} style={{ color: '#c9960a' }} />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: '#1a3c24' }}>{name1}</span>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs"
            style={{ background: '#7ecba4', color: '#fff' }}>
            {name1.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {isMyBattle && (
        <div className="flex gap-2 mt-3">
          <button onClick={() => onOpen(battle._id)}
            className="flex-1 py-2 rounded-full text-xs font-bold"
            style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800' }}>
            Open Battle
          </button>
          {battle.status === 'open' && (
            <button onClick={() => onLeave(battle._id)}
              className="px-4 py-2 rounded-full text-xs font-bold"
              style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
              Leave
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
function BattlesLobby() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuthStore();

  const [subAdmins, setSubAdmins]   = useState([]);
  const [subWallets, setSubWallets] = useState([]);
  const [subAdminId, setSubAdminId] = useState(searchParams.get('subAdminId') || '');

  const [openBattles, setOpenBattles]     = useState([]);
  const [runningBattles, setRunningBattles] = useState([]);
  const [myBattles, setMyBattles]          = useState([]);
  const [loading, setLoading]              = useState(true);

  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [joiningId, setJoiningId]     = useState(null);
  const [entryFilter, setEntryFilter] = useState('');
  const [form, setForm] = useState({
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
    } catch {}
  }, []);

  const fetchBattles = useCallback(async () => {
    setLoading(true);
    try {
      const query = subAdminId ? `/battles?subAdminId=${subAdminId}&limit=80` : `/battles?limit=80`;
      const [l, m] = await Promise.all([
        api.get(query),
        api.get('/battles/mine?limit=50'),
      ]);
      const all = l.data.data || [];
      setOpenBattles(all.filter(b => b.status === 'open'));
      setRunningBattles(all.filter(b => ['in_progress','result_pending','disputed'].includes(b.status)));
      setMyBattles(m.data.data || []);
    } catch {
      toast.error('Failed to load battles');
    } finally {
      setLoading(false);
    }
  }, [subAdminId]);

  useEffect(() => { fetchSubAdmins(); }, [fetchSubAdmins]);
  useEffect(() => { fetchBattles(); }, [fetchBattles]);

  // Real-time + fallback poll
  useEffect(() => {
    const socket = connectSocket();
    const refresh = () => fetchBattles();
    if (subAdminId) {
      socket.emit('lobby:subscribe', { subAdminId });
      ['battle:created','battle:updated','battle:completed','battle:cancelled'].forEach(e => socket.on(e, refresh));
      return () => {
        socket.emit('lobby:unsubscribe', { subAdminId });
        ['battle:created','battle:updated','battle:completed','battle:cancelled'].forEach(e => socket.off(e, refresh));
      };
    } else {
      const t = setInterval(refresh, 15000);
      return () => clearInterval(t);
    }
  }, [subAdminId, fetchBattles]);

  const myWallet = subWallets.find(w => w.subAdminId === subAdminId);
  const activeSubAdmin = subAdmins.find(s => s._id === subAdminId);

  // Filter open battles by entry amount if set
  const filteredOpen = entryFilter
    ? openBattles.filter(b => b.entryCoins === parseInt(entryFilter))
    : openBattles;

  // My active battles (not completed/cancelled)
  const myActive = myBattles.filter(b => !['completed','cancelled'].includes(b.status));

  const joinBattle = async (battleId) => {
    setJoiningId(battleId);
    try {
      const { data } = await api.post(`/battles/${battleId}/join`);
      if (data.data?.roomId) {
        toast.success('Battle full! Opening credentials…');
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
      toast.success('Left — entry refunded');
      await refreshUser();
      fetchBattles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave');
    }
  };

  const createBattle = async () => {
    if (!subAdminId) { toast.error('Select a Sub-Admin first'); return; }
    if (String(form.roomId).trim().length < 3) { toast.error('Enter Ludo King Room ID (min 3 chars)'); return; }
    setCreating(true);
    try {
      const { data } = await api.post('/battles', { subAdminId, ...form });
      toast.success(data.message);
      setCreateModal(false);
      setForm({ gameMode: 'classic', maxPlayers: 2, entryCoins: 100, roomId: '', roomPassword: '' });
      fetchBattles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-4 pb-4">

      {/* Withdrawal banner */}
      <div className="info-banner text-xs flex items-start gap-2">
        <span>⚡</span>
        <span>Super Fast Withdrawal — आमतौर पर 5 मिनट में। देरी हो तो Support से संपर्क करें। 😊</span>
      </div>

      {/* Entry amount filter */}
      <div className="flex items-center gap-2">
        <div className="amount-input-wrap flex-1">
          <input
            type="number"
            placeholder="Entry Amount"
            value={entryFilter}
            onChange={e => setEntryFilter(e.target.value)}
            min={0}
          />
          <button
            onClick={() => { /* filter applied reactively */ }}
            className="px-5 py-3 font-black text-sm rounded-r-full"
            style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800' }}
          >
            SET
          </button>
        </div>
        {entryFilter && (
          <button onClick={() => setEntryFilter('')}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Sub-admin filter pills */}
      {subAdmins.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSubAdminId('')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${subAdminId === '' ? 'border-[#c9960a] bg-[#fff3c4] text-[#7a5a00]' : 'border-[#e8d49a] text-[#a09070]'}`}>
            🌐 All
          </button>
          {subAdmins.map(sa => (
            <button key={sa._id} onClick={() => setSubAdminId(sa._id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${subAdminId === sa._id ? 'border-[#c9960a] bg-[#fff3c4] text-[#7a5a00]' : 'border-[#e8d49a] text-[#a09070]'}`}>
              {sa.displayName}
            </button>
          ))}
        </div>
      )}

      {/* Wallet info + Create button */}
      <div className="flex items-center justify-between">
        <div>
          {myWallet ? (
            <p className="text-xs" style={{ color: '#7a5a00' }}>
              💼 Available: <strong>₹{myWallet.balance}</strong>
              {' '}(🏆 Winning: ₹{myWallet.winningBalance || 0})
            </p>
          ) : (
            <Link href="/buy-coins" className="text-xs font-semibold underline" style={{ color: '#c9960a' }}>
              Buy coins to play →
            </Link>
          )}
        </div>
        <button onClick={() => setCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800', boxShadow: '0 2px 8px rgba(201,150,10,0.3)' }}>
          <Plus size={13} /> Create Battle
        </button>
      </div>

      {/* ── Open Battles section ──────────────────────────────────────────── */}
      <div>
        <div className="section-pill mb-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-black"
              style={{ background: '#e8c84a', color: '#7a5a00' }}>✕</span>
            <span>Open Battles ({filteredOpen.length})</span>
          </div>
          <button className="text-xs font-semibold flex items-center gap-1" style={{ color: '#c9960a' }}>
            🤔 Rules <ChevronRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 rounded-full border-4 border-[#e8d49a] border-t-[#c9960a] animate-spin mx-auto" />
          </div>
        ) : filteredOpen.length === 0 ? (
          <div className="text-center py-8 rounded-2xl" style={{ background: '#f5e9c8', border: '1.5px dashed #e8d49a' }}>
            <Swords size={32} className="mx-auto mb-2" style={{ color: '#c9960a' }} />
            <p className="text-sm font-semibold" style={{ color: '#7a5a00' }}>
              {entryFilter ? `No battles for ₹${entryFilter}` : 'No open battles right now'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#a09070' }}>Create the first one!</p>
          </div>
        ) : (
          filteredOpen.map(b => (
            <OpenBattleCard key={b._id} battle={b} onJoin={joinBattle} joiningId={joiningId} />
          ))
        )}
      </div>

      {/* ── Running Battles section ───────────────────────────────────────── */}
      {runningBattles.length > 0 && (
        <div>
          <div className="section-pill mb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-black"
                style={{ background: '#e8c84a', color: '#7a5a00' }}>✕</span>
              <span>Running Battles ({runningBattles.length})</span>
            </div>
            <span className="live-dot" />
          </div>

          {runningBattles.map(b => {
            const isMine = myBattles.some(m => m._id === b._id);
            return (
              <RunningBattleCard key={b._id} battle={b} isMyBattle={isMine}
                onOpen={id => window.location.href = `/battles/${id}`}
                onLeave={leaveBattle} />
            );
          })}
        </div>
      )}

      {/* ── My Active Battles ─────────────────────────────────────────────── */}
      {myActive.length > 0 && runningBattles.filter(b => myBattles.some(m=>m._id===b._id)).length === 0 && (
        <div>
          <div className="section-pill mb-3">
            <span>My Battles ({myActive.length})</span>
          </div>
          {myActive.map(b => (
            <RunningBattleCard key={b._id} battle={b} isMyBattle={true}
              onOpen={id => window.location.href = `/battles/${id}`}
              onLeave={leaveBattle} />
          ))}
        </div>
      )}

      {/* ── Create Battle Modal ───────────────────────────────────────────── */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Battle">
        <div className="p-5 space-y-4" style={{ background: '#fffdf5' }}>
          <div className="p-3 rounded-xl text-xs" style={{ background: '#e8f8f0', border: '1px solid #a8dfc0', color: '#1a3c24' }}>
            Pehle Ludo King mein room banao, Room ID yahan enter karo. Battle fill hone ke baad hi dono players ko Room credentials milenge.
          </div>

          {/* Sub-admin */}
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: '#7a5a00' }}>Sub-Admin *</label>
            <select className="input-field text-sm" value={subAdminId} onChange={e => setSubAdminId(e.target.value)}>
              <option value="">Select Sub-Admin…</option>
              {subAdmins.map(sa => <option key={sa._id} value={sa._id}>{sa.displayName}</option>)}
            </select>
            {myWallet && (
              <p className="text-xs mt-1" style={{ color: '#7ecba4' }}>
                Available: ₹{myWallet.balance} (Deposit: ₹{myWallet.depositBalance || 0} · Winning: ₹{myWallet.winningBalance || 0})
              </p>
            )}
          </div>

          {/* Game mode */}
          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: '#7a5a00' }}>Game Mode</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['classic','quick','one_kill','popular'].map(m => (
                <button key={m} onClick={() => setForm({...form, gameMode: m})}
                  className="py-2 rounded-xl text-xs font-bold transition-all"
                  style={form.gameMode===m ? {background:'linear-gradient(to bottom,#f5c842,#c9960a)',color:'#3b2800'} : {background:'#f0e6c8',color:'#7a5a00',border:'1px solid #e8d49a'}}>
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Players */}
          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: '#7a5a00' }}>Players</label>
            <div className="grid grid-cols-2 gap-2">
              {[2,4].map(n => (
                <button key={n} onClick={() => setForm({...form, maxPlayers:n})}
                  className="py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={form.maxPlayers===n ? {background:'linear-gradient(to bottom,#f5c842,#c9960a)',color:'#3b2800'} : {background:'#f0e6c8',color:'#7a5a00',border:'1px solid #e8d49a'}}>
                  {n} Players · Pot ₹{form.entryCoins*n}
                </button>
              ))}
            </div>
          </div>

          {/* Entry */}
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: '#7a5a00' }}>Entry Coins (₹1 = 1 coin)</label>
            <input type="number" min={50} value={form.entryCoins}
              onChange={e => setForm({...form, entryCoins: parseInt(e.target.value)||0})}
              className="input-field text-sm" placeholder="e.g. 500" />
          </div>

          {/* Room ID */}
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: '#7a5a00' }}>Ludo King Room ID *</label>
            <input type="text" value={form.roomId}
              onChange={e => setForm({...form, roomId: e.target.value})}
              className="input-field text-sm" placeholder="e.g. 48291037" />
          </div>

          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: '#7a5a00' }}>Room Password (optional)</label>
            <input type="text" value={form.roomPassword}
              onChange={e => setForm({...form, roomPassword: e.target.value})}
              className="input-field text-sm" placeholder="Leave blank if none" />
          </div>

          {/* Summary box */}
          <div className="rounded-2xl p-4" style={{ background: '#e8f8f0', border: '1.5px solid #a8dfc0' }}>
            <div className="flex justify-between text-sm font-semibold" style={{ color: '#1a3c24' }}>
              <span>Total Pot</span>
              <span>₹{form.entryCoins * form.maxPlayers}</span>
            </div>
            <div className="flex justify-between text-sm font-black mt-1" style={{ color: '#0a7a3c' }}>
              <span>Winner Prize</span>
              <span>₹{Math.floor(form.entryCoins * form.maxPlayers * (1 - (activeSubAdmin?.commissionPercent ?? 5)/100))}</span>
            </div>
          </div>

          <button onClick={createBattle} disabled={creating || !form.roomId || form.entryCoins < 50 || !subAdminId}
            className="w-full py-3.5 rounded-full font-black text-sm active:scale-95 transition-transform disabled:opacity-50"
            style={{ background: 'linear-gradient(to bottom,#2ecc71,#0a7a3c)', color: '#fff', boxShadow: '0 3px 12px rgba(10,122,60,0.3)' }}>
            {creating ? 'Creating…' : '⚔️ Create & Join Battle'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function BattlesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-[#e8d49a] border-t-[#c9960a] animate-spin" />
      </div>
    }>
      <BattlesLobby />
    </Suspense>
  );
}
