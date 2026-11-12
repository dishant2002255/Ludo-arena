'use client';
import { useEffect, useState } from 'react';
import { Coins, TrendingUp, TrendingDown, Calendar, Trophy, PlusCircle, Clock, CheckCircle, XCircle, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/Card';
import { StatSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow, format } from 'date-fns';

const TYPE_CONFIG = {
  registration_bonus:  { label: 'Welcome Bonus',     color: 'green' },
  daily_bonus:         { label: 'Daily Bonus',        color: 'green' },
  match_entry:         { label: 'Match Entry',        color: 'red'   },
  match_win:           { label: 'Match Win Reward',   color: 'green' },
  admin_adjust:        { label: 'Admin Adjustment',   color: 'blue'  },
  coin_request:        { label: 'Coin Request Grant', color: 'purple' },
  admin_correction:    { label: 'Admin Correction',   color: 'blue'  },
  tournament_reward:   { label: 'Tournament Reward',  color: 'yellow' },
  coin_purchase:       { label: 'UPI Coin Purchase',  color: 'green' },
  refund:              { label: 'Refund',             color: 'yellow' },
};

const REQUEST_STATUS = {
  pending:  { icon: <Clock size={14} />,        label: 'Pending',  badge: 'yellow' },
  approved: { icon: <CheckCircle size={14} />,  label: 'Approved', badge: 'green'  },
  rejected: { icon: <XCircle size={14} />,      label: 'Rejected', badge: 'red'    },
};

export default function WalletPage() {
  const { user, refreshUser } = useAuthStore();
  const [balance, setBalance]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [claiming, setClaiming]         = useState(false);
  const [tab, setTab]                   = useState('transactions'); // 'transactions' | 'requests'
  const [requestModal, setRequestModal] = useState(false);
  const [form, setForm]                 = useState({ requestedAmount: 500, reason: '' });
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, t, r] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/history?limit=30'),
        api.get('/wallet/coin-requests?limit=20'),
      ]);
      setBalance(b.data.data);
      setTransactions(t.data.data || []);
      setRequests(r.data.data || []);
    } catch { toast.error('Failed to load wallet'); }
    finally { setLoading(false); }
  };

  const claimBonus = async () => {
    setClaiming(true);
    try {
      const { data } = await api.post('/wallet/daily-bonus/claim');
      toast.success(data.message);
      await refreshUser();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setClaiming(false); }
  };

  const submitRequest = async () => {
    if (!form.reason || form.reason.length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    if (form.requestedAmount < 200) {
      toast.error('Minimum request is 200 coins');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/wallet/coin-requests', form);
      toast.success('Coin request submitted! Admin will review shortly.');
      setRequestModal(false);
      setForm({ requestedAmount: 500, reason: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  const hasPendingRequest = requests.some(r => r.status === 'pending');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Wallet</h1>
          <p className="text-slate-400 mt-1">Virtual coins — free to play, no real money</p>
        </div>
        <div className="flex gap-2">
          <Link href="/buy-coins">
            <Button icon={<ShoppingCart size={18} />} variant="secondary" size="sm">Buy Coins</Button>
          </Link>
          <Button
            icon={<PlusCircle size={18} />}
            onClick={() => setRequestModal(true)}
            disabled={hasPendingRequest}
            variant={hasPendingRequest ? 'secondary' : 'primary'}
            size="sm"
          >
            {hasPendingRequest ? 'Request Pending…' : 'Request Free Coins'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <StatCard title="Balance"       value={`${user?.walletBalance?.toLocaleString() || 0}`} icon={<Coins size={22} />}     color="yellow" />
            <StatCard title="Total Earned"  value={(balance?.totalEarned || 0).toLocaleString()}    icon={<TrendingUp size={22} />}  color="green" />
            <StatCard title="Total Used"    value={(balance?.totalSpent || 0).toLocaleString()}     icon={<TrendingDown size={22} />} color="red" />
            <StatCard title="Match Rewards" value={(balance?.totalMatchRewards || 0).toLocaleString()} icon={<Trophy size={22} />}   color="purple" />
          </>
        )}
      </div>

      {/* Daily bonus card */}
      <div className={`game-card p-5 ${balance?.canClaimDaily ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5' : ''}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Calendar size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Daily Login Bonus</p>
              <p className="text-slate-400 text-sm">
                {balance?.canClaimDaily
                  ? '100 free coins available!'
                  : `Next claim: ${balance?.nextClaimAt ? formatDistanceToNow(new Date(balance.nextClaimAt), { addSuffix: true }) : '—'}`}
              </p>
            </div>
          </div>
          <Button variant="success" disabled={!balance?.canClaimDaily} loading={claiming} onClick={claimBonus} size="sm">
            <Coins size={16} />
            {balance?.canClaimDaily ? 'Claim 100 Coins' : 'Already Claimed'}
          </Button>
        </div>
      </div>

      {/* Free-to-play notice */}
      <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-500">
        ⓘ Virtual coins are free demo credits only. They have no monetary value and cannot be purchased, withdrawn, or exchanged for real-world goods or currency.
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {[['transactions', 'Transaction History'], ['requests', 'Coin Requests']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all
              ${tab === key
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {label}
            {key === 'requests' && requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transactions */}
      {tab === 'transactions' && (
        <div className="game-card overflow-hidden">
          {loading ? <TableSkeleton /> : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No transactions yet</div>
          ) : (
            <div className="divide-y divide-white/5">
              {transactions.map(tx => {
                const cfg = TYPE_CONFIG[tx.type] || { label: tx.type, color: 'gray' };
                return (
                  <div key={tx._id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold
                        ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {tx.amount > 0 ? '+' : '−'}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{cfg.label}</p>
                        <p className="text-xs text-slate-500">{tx.description || ''}</p>
                        {tx.match?.name && <p className="text-xs text-purple-400">{tx.match.name}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">Balance: {tx.balanceAfter?.toLocaleString()}</p>
                      <p className="text-xs text-slate-600">
                        {tx.createdAt ? formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Coin Requests */}
      {tab === 'requests' && (
        <div className="game-card overflow-hidden">
          {loading ? <TableSkeleton /> : requests.length === 0 ? (
            <div className="p-12 text-center">
              <Coins size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No coin requests yet</p>
              <p className="text-slate-500 text-sm mt-1">Click "Request Free Coins" to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {requests.map(req => {
                const st = REQUEST_STATUS[req.status] || REQUEST_STATUS.pending;
                return (
                  <div key={req._id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold text-sm">{req.requestedAmount.toLocaleString()} coins</span>
                        <Badge variant={st.badge}>{st.icon}<span className="ml-1">{st.label}</span></Badge>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{req.reason}</p>
                      {req.adminRemarks && (
                        <p className="text-xs text-slate-500 mt-0.5 italic">Admin: {req.adminRemarks}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500">
                        {req.createdAt ? format(new Date(req.createdAt), 'dd MMM yyyy') : ''}
                      </p>
                      {req.reviewedAt && (
                        <p className="text-xs text-slate-600">
                          Reviewed {formatDistanceToNow(new Date(req.reviewedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Request Coins Modal */}
      <Modal isOpen={requestModal} onClose={() => setRequestModal(false)} title="Request Free Demo Coins">
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            These are free demo coins only. No real money is involved.
            Minimum request: 200 coins. Admin approval required.
          </div>
          <Input
            label="Coins Requested"
            type="number"
            min={200}
            max={10000}
            value={form.requestedAmount}
            onChange={e => setForm({ ...form, requestedAmount: parseInt(e.target.value) || 200 })}
            hint="Min 200 — Max 10,000"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Reason</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Why do you need these coins? (min 10 characters)"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
            />
            <p className="text-xs text-slate-500">{form.reason.length}/500 chars</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRequestModal(false)}>Cancel</Button>
            <Button loading={submitting} onClick={submitRequest}>Submit Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
