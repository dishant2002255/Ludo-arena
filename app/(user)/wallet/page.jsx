'use client';
import { useEffect, useState } from 'react';
import {
  Coins, TrendingUp, TrendingDown, Trophy, ShoppingCart, Lock, ArrowDownToLine, Building2,
} from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow, format } from 'date-fns';

const TYPE_CONFIG = {
  registration_bonus:  { label: 'Welcome Bonus',      color: 'green'  },
  daily_bonus:         { label: 'Daily Bonus',        color: 'green'  },
  match_entry:         { label: 'Match Entry',        color: 'red'    },
  match_win:           { label: 'Match Win Reward',  color: 'green'  },
  admin_adjust:        { label: 'Admin Adjustment',   color: 'blue'   },
  coin_request:        { label: 'Coin Request Grant', color: 'purple' },
  admin_correction:    { label: 'Admin Correction',   color: 'blue'   },
  tournament_reward:   { label: 'Tournament Reward', color: 'yellow' },
  coin_purchase:       { label: 'UPI Coin Purchase',  color: 'green'  },
  refund:              { label: 'Refund',              color: 'yellow' },
  battle_entry:        { label: 'Battle Entry',       color: 'red'    },
  battle_win:          { label: 'Battle Win',          color: 'green'  },
  battle_refund:       { label: 'Battle Refund',      color: 'yellow' },
  withdrawal_lock:     { label: 'Withdrawal Locked',  color: 'red'    },
  withdrawal_approved: { label: 'Withdrawal Paid',    color: 'blue'   },
  withdrawal_refund:  { label: 'Withdrawal Refund',   color: 'yellow' },
};

const WD_STATUS = {
  pending:  { label: 'Pending',  badge: 'yellow' },
  approved: { label: 'Paid',    badge: 'green'  },
  rejected: { label: 'Refunded', badge: 'red'   },
};

export default function WalletPage() {
  const { user, refreshUser } = useAuthStore();
  const [balance, setBalance]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [subWallets, setSubWallets]     = useState([]);
  const [withdrawals, setWithdrawals]    = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('transactions'); // transactions | withdrawals
  const [wdModal, setWdModal]            = useState(false);
  const [wdForm, setWdForm]             = useState({
    subAdminId: '', amountCoins: 200, payoutMethod: 'upi',
    userUpiId: '', accountHolderName: '',
  });
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, t, sw, wd] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/history?limit=30'),
        api.get('/wallet/my-sub-wallets'),
        api.get('/withdrawals/mine'),
      ]);
      setBalance(b.data.data);
      setTransactions(t.data.data || []);
      setSubWallets(sw.data.data || []);
      setWithdrawals(wd.data.data || []);
    } catch {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const withdrawableWallet = subWallets.find(
    (w) => w.subAdminId === wdForm.subAdminId
  );

  const submitWithdrawal = async () => {
    const wallet = subWallets.find((w) => w.subAdminId === wdForm.subAdminId);
    if (!wallet) { toast.error('Select a Sub-Admin'); return; }
    if (wdForm.amountCoins < 1) { toast.error('Enter a valid amount'); return; }
    if (wdForm.amountCoins > wallet.balance) {
      toast.error(`Available under ${wallet.subAdminName}: ${wallet.balance} coins`);
      return;
    }
    if (wdForm.payoutMethod === 'upi' && !wdForm.userUpiId.includes('@')) {
      toast.error('Enter a valid UPI ID (name@bank)');
      return;
    }
    if (wdForm.accountHolderName.trim().length < 2) {
      toast.error('Account holder name is required');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/withdrawals', {
        subAdminId: wdForm.subAdminId,
        amountCoins: wdForm.amountCoins,
        payoutMethod: wdForm.payoutMethod,
        userUpiId: wdForm.userUpiId,
        accountHolderName: wdForm.accountHolderName,
      });
      toast.success(data.message);
      setWdModal(false);
      setWdForm({ subAdminId: '', amountCoins: 200, payoutMethod: 'upi', userUpiId: '', accountHolderName: '' });
      await refreshUser();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Wallet</h1>
          <p className="text-slate-400 mt-1">1 coin = ₹1 · Real-money balance</p>
        </div>
        <div className="flex gap-2">
          <Link href="/buy-coins">
            <Button icon={<ShoppingCart size={18} />} variant="primary" size="sm">Buy Coins</Button>
          </Link>
          <Button
            icon={<ArrowDownToLine size={18} />}
            variant="secondary"
            size="sm"
            onClick={() => setWdModal(true)}
            disabled={subWallets.filter((w) => w.balance > 0).length === 0}
          >
            Withdraw
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <TableSkeleton key={i} />) : (
          <>
            <StatCard title="Balance"        value={`${user?.walletBalance?.toLocaleString() || 0}`} icon={<Coins size={22} />} color="yellow" />
            <StatCard title="Total Earned"   value={(balance?.totalEarned || 0).toLocaleString()}     icon={<TrendingUp size={22} />}  color="green" />
            <StatCard title="Total Used"     value={(balance?.totalSpent || 0).toLocaleString()}      icon={<TrendingDown size={22} />} color="red" />
            <StatCard title="Match Rewards"  value={(balance?.totalMatchRewards || 0).toLocaleString()} icon={<Trophy size={22} />}  color="purple" />
          </>
        )}
      </div>

      {/* Sub-wallets per Sub-Admin */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Coin Wallets by Sub-Admin</h2>
        {loading ? <TableSkeleton /> : subWallets.length === 0 ? (
          <div className="game-card p-8 text-center text-slate-400">
            <Coins size={36} className="mx-auto mb-3 text-slate-600" />
            <p>No coin wallets yet. Buy coins from a Sub-Admin to get started.</p>
            <Link href="/buy-coins" className="text-purple-400 underline text-sm mt-2 inline-block">Buy Coins →</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subWallets.map((w) => (
              <div key={w.subAdminId} className="game-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold">{w.subAdminName}</p>
                    <p className="text-xs text-slate-500">
                      {w.subAdminActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <Badge variant={w.balance > 0 ? 'green' : 'gray'}>
                    {(w.balance || 0).toLocaleString()} coins
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-500">In Battles</p>
                    <p className="text-amber-400 font-semibold">{w.lockedBattleBalance || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-500">In Withdrawal</p>
                    <p className="text-amber-400 font-semibold">{w.lockedWithdrawalBalance || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-500">Withdrew</p>
                    <p className="text-slate-300 font-semibold">{w.totalWithdrawn || 0}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Link href={`/battles?subAdminId=${w.subAdminId}`} className="text-xs text-purple-400 hover:underline">
                    Play battles under {w.subAdminName} →
                  </Link>
                  <button
                    className="text-xs text-emerald-400 hover:underline disabled:text-slate-600"
                    disabled={w.balance <= 0}
                    onClick={() => {
                      setWdForm({ ...wdForm, subAdminId: w.subAdminId });
                      setWdModal(true);
                    }}
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {[['transactions', 'Transaction History'], ['withdrawals', 'Withdrawals']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all
              ${tab === key
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {label}
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
              {transactions.map((tx) => {
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

      {/* Withdrawals */}
      {tab === 'withdrawals' && (
        <div className="game-card overflow-hidden">
          {loading ? <TableSkeleton /> : withdrawals.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No withdrawal requests yet</div>
          ) : (
            <div className="divide-y divide-white/5">
              {withdrawals.map((wd) => {
                const st = WD_STATUS[wd.status] || WD_STATUS.pending;
                return (
                  <div key={wd._id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold text-sm">₹{wd.amountRupees?.toLocaleString()} ({wd.amountCoins} coins)</span>
                        <Badge variant={st.badge}>{st.label}</Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        Via {wd.payoutMethod?.toUpperCase()} to {wd.userUpiId || 'bank'} · {wd.subAdmin?.subAdminInfo?.displayName || 'Sub-Admin'}
                      </p>
                      <p className="text-xs text-slate-600 font-mono">{wd.withdrawalReference}</p>
                      {wd.utrReference && <p className="text-xs text-emerald-400">UTR: {wd.utrReference}</p>}
                      {wd.adminRemarks && <p className="text-xs text-amber-400 mt-0.5 italic">Admin: {wd.adminRemarks}</p>}
                    </div>
                    <div className="text-right shrink-0 text-xs text-slate-500">
                      <p>{wd.createdAt ? format(new Date(wd.createdAt), 'dd MMM yyyy, HH:mm') : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Withdraw modal */}
      <Modal isOpen={wdModal} onClose={() => setWdModal(false)} title="Withdraw Coins (1 coin = ₹1)">
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            Coins are sent back to the Sub-Admin and you receive ₹1 per coin via UPI, paid by your Sub-Admin.
            Your coins are locked until the payout is approved or refunded.
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Withdraw from</label>
            <select
              className="input-field"
              value={wdForm.subAdminId}
              onChange={(e) => setWdForm({ ...wdForm, subAdminId: e.target.value })}
            >
              <option value="">Select Sub-Admin wallet…</option>
              {subWallets.filter((w) => w.balance > 0).map((w) => (
                <option key={w.subAdminId} value={w.subAdminId}>
                  {w.subAdminName} — {w.balance} coins available
                </option>
              ))}
            </select>
            {withdrawableWallet && (
              <p className="text-xs text-slate-500">
                Available: {withdrawableWallet.balance} coins
                (locked in battles: {withdrawableWallet.lockedBattleBalance})
              </p>
            )}
          </div>

          <Input
            label="Amount (coins = ₹)"
            type="number"
            min={1}
            value={wdForm.amountCoins}
            onChange={(e) => setWdForm({ ...wdForm, amountCoins: parseInt(e.target.value) || 0 })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Payout method</label>
            <div className="flex gap-2">
              {['upi', 'bank'].map((m) => (
                <button key={m} onClick={() => setWdForm({ ...wdForm, payoutMethod: m })}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all
                    ${wdForm.payoutMethod === m
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {m === 'upi' ? 'UPI' : 'Bank Transfer'}
                </button>
              ))}
            </div>
          </div>

          {wdForm.payoutMethod === 'upi' ? (
            <Input
              label="Your UPI ID"
              placeholder="yourname@bank"
              value={wdForm.userUpiId}
              onChange={(e) => setWdForm({ ...wdForm, userUpiId: e.target.value })}
            />
          ) : null}

          <Input
            label="Account holder name"
            value={wdForm.accountHolderName}
            onChange={(e) => setWdForm({ ...wdForm, accountHolderName: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setWdModal(false)}>Cancel</Button>
            <Button loading={submitting} onClick={submitWithdrawal}>
              <ArrowDownToLine size={16} /> Request ₹{wdForm.amountCoins || 0}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
