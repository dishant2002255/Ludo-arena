'use client';
import { useEffect, useState } from 'react';
import {
  Coins, TrendingUp, TrendingDown, Trophy, ShoppingCart, ArrowDownToLine,
  Gamepad2, Info,
} from 'lucide-react';
import Link from 'next/link';
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
  daily_bonus:         { label: 'Daily Bonus',         color: 'green'  },
  match_entry:         { label: 'Match Entry',         color: 'red'    },
  match_win:           { label: 'Match Win Reward',    color: 'green'  },
  admin_adjust:        { label: 'Admin Adjustment',    color: 'blue'   },
  coin_request:        { label: 'Coin Request Grant',  color: 'purple' },
  admin_correction:    { label: 'Admin Correction',    color: 'blue'   },
  tournament_reward:   { label: 'Tournament Reward',   color: 'yellow' },
  coin_purchase:       { label: 'UPI Coin Purchase',   color: 'green'  },
  refund:              { label: 'Refund',               color: 'yellow' },
  battle_entry:        { label: 'Battle Entry',         color: 'red'    },
  battle_win:          { label: 'Battle Win 🏆',        color: 'green'  },
  battle_refund:       { label: 'Battle Refund',        color: 'yellow' },
  withdrawal_lock:     { label: 'Withdrawal Locked',    color: 'red'    },
  withdrawal_approved: { label: 'Withdrawal Paid ✓',   color: 'blue'   },
  withdrawal_refund:   { label: 'Withdrawal Refunded',  color: 'yellow' },
};

const WD_STATUS = {
  pending:  { label: 'Pending',   badge: 'yellow' },
  approved: { label: 'Paid ✓',   badge: 'green'  },
  rejected: { label: 'Refunded', badge: 'red'    },
};

function DualWalletCard({ wallet, onWithdraw }) {
  const totalPlayable = wallet.balance;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-bold">{wallet.subAdminName}</p>
          <p className={`text-xs ${wallet.subAdminActive ? 'text-emerald-400' : 'text-red-400'}`}>
            {wallet.subAdminActive ? '● Active' : '● Inactive'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Total Playable</p>
          <p className="text-xl font-black text-white">₹{totalPlayable.toLocaleString()}</p>
        </div>
      </div>

      {/* Dual buckets */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Gamepad2 size={13} className="text-blue-400" />
            <p className="text-xs text-blue-300 font-semibold">Deposit Coins</p>
          </div>
          <p className="text-2xl font-black text-blue-400">₹{(wallet.depositBalance || 0).toLocaleString()}</p>
          <p className="text-xs text-blue-400/60 mt-0.5">Play Only</p>
        </div>

        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy size={13} className="text-emerald-400" />
            <p className="text-xs text-emerald-300 font-semibold">Winning Coins</p>
          </div>
          <p className="text-2xl font-black text-emerald-400">₹{(wallet.winningBalance || 0).toLocaleString()}</p>
          <p className="text-xs text-emerald-400/60 mt-0.5">Withdrawable ✓</p>
        </div>
      </div>

      {/* Escrow indicators */}
      {(wallet.lockedBattleBalance > 0 || wallet.lockedWithdrawalBalance > 0) && (
        <div className="flex gap-2 text-xs">
          {wallet.lockedBattleBalance > 0 && (
            <span className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              🔒 ₹{wallet.lockedBattleBalance} in battle
            </span>
          )}
          {wallet.lockedWithdrawalBalance > 0 && (
            <span className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              🔒 ₹{wallet.lockedWithdrawalBalance} in withdrawal
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/battles?subAdminId=${wallet.subAdminId}`} className="flex-1">
          <Button size="sm" fullWidth variant="secondary" icon={<Gamepad2 size={13} />}>
            Play Battles
          </Button>
        </Link>
        <Button
          size="sm"
          icon={<ArrowDownToLine size={13} />}
          disabled={!wallet.winningBalance || wallet.winningBalance <= 0}
          onClick={() => onWithdraw(wallet)}
        >
          Withdraw
        </Button>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { user, refreshUser } = useAuthStore();
  const [balance, setBalance]       = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [subWallets, setSubWallets]  = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading]        = useState(true);
  const [tab, setTab]                = useState('wallets'); // wallets | transactions | withdrawals
  const [wdModal, setWdModal]        = useState(false);
  const [wdWallet, setWdWallet]      = useState(null);
  const [wdForm, setWdForm]          = useState({
    amountCoins: 200, payoutMethod: 'upi', userUpiId: '', accountHolderName: '',
  });
  const [submitting, setSubmitting]  = useState(false);

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

  const openWithdrawModal = (wallet) => {
    setWdWallet(wallet);
    setWdForm({ amountCoins: Math.min(200, wallet.winningBalance || 0), payoutMethod: 'upi', userUpiId: '', accountHolderName: '' });
    setWdModal(true);
  };

  const submitWithdrawal = async () => {
    if (!wdWallet) { toast.error('No wallet selected'); return; }
    if (wdForm.amountCoins < 1) { toast.error('Enter a valid amount'); return; }
    if ((wdWallet.winningBalance || 0) < wdForm.amountCoins) {
      toast.error(`Available Winning Balance: ₹${wdWallet.winningBalance || 0}. Only winning coins are withdrawable.`);
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
        subAdminId: wdWallet.subAdminId,
        amountCoins: wdForm.amountCoins,
        payoutMethod: wdForm.payoutMethod,
        userUpiId: wdForm.userUpiId,
        accountHolderName: wdForm.accountHolderName,
      });
      toast.success(data.message);
      setWdModal(false);
      await refreshUser();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  // Totals across all sub-wallets
  const totalDeposit  = subWallets.reduce((s, w) => s + (w.depositBalance || 0), 0);
  const totalWinning  = subWallets.reduce((s, w) => s + (w.winningBalance || 0), 0);
  const totalPlayable = totalDeposit + totalWinning;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">My Wallet</h1>
          <p className="text-slate-400 mt-1">1 coin = ₹1 · Real-money balance</p>
        </div>
        <Link href="/buy-coins">
          <Button icon={<ShoppingCart size={18} />} variant="primary" size="sm">Buy Coins via UPI</Button>
        </Link>
      </div>

      {/* Top summary — dual wallet */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 size={18} className="text-blue-400" />
            <p className="text-sm text-blue-300 font-semibold">🎮 Deposit Coins</p>
          </div>
          <p className="text-3xl font-black text-blue-400">₹{totalDeposit.toLocaleString()}</p>
          <p className="text-xs text-blue-400/60 mt-1">Play Only — Not Withdrawable</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-emerald-400" />
            <p className="text-sm text-emerald-300 font-semibold">🏆 Winning Coins</p>
          </div>
          <p className="text-3xl font-black text-emerald-400">₹{totalWinning.toLocaleString()}</p>
          <p className="text-xs text-emerald-400/60 mt-1">Withdrawable to UPI ✓</p>
        </div>

        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Coins size={18} className="text-yellow-400" />
            <p className="text-sm text-yellow-300 font-semibold">Total Playable</p>
          </div>
          <p className="text-3xl font-black text-yellow-400">₹{totalPlayable.toLocaleString()}</p>
          <p className="text-xs text-yellow-400/60 mt-1">Deposit + Winning</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-400">
          <span className="text-blue-300 font-semibold">Deposit Coins</span> (bought via UPI) are for gameplay only.{' '}
          <span className="text-emerald-300 font-semibold">Winning Coins</span> (earned from battle wins) can be withdrawn to your UPI anytime (Min ₹200).
          Purchased coins are <strong className="text-white">never directly withdrawable</strong> — win battles to earn withdrawable coins!
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {[['wallets', '💼 My Wallets'], ['transactions', '📋 History'], ['withdrawals', '💸 Withdrawals']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all
              ${tab === key ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Sub-wallet cards */}
      {tab === 'wallets' && (
        loading ? <TableSkeleton /> : subWallets.length === 0 ? (
          <div className="game-card p-10 text-center text-slate-400">
            <Coins size={36} className="mx-auto mb-3 text-slate-600" />
            <p>No coin wallets yet.</p>
            <Link href="/buy-coins" className="text-purple-400 underline text-sm mt-2 inline-block">Buy Coins from a Sub-Admin →</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subWallets.map((w) => (
              <DualWalletCard key={w.subAdminId} wallet={w} onWithdraw={openWithdrawModal} />
            ))}
          </div>
        )
      )}

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
                      <p className="text-xs text-slate-500">Bal: {tx.balanceAfter?.toLocaleString()}</p>
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
                        Via {wd.payoutMethod?.toUpperCase()} to {wd.userUpiId || 'bank'}
                      </p>
                      <p className="text-xs text-slate-600 font-mono">{wd.withdrawalReference}</p>
                      {wd.utrReference && <p className="text-xs text-emerald-400">UTR: {wd.utrReference}</p>}
                      {wd.adminRemarks && <p className="text-xs text-amber-400 mt-0.5 italic">Admin: {wd.adminRemarks}</p>}
                    </div>
                    <p className="text-right text-xs text-slate-500 shrink-0">
                      {wd.createdAt ? format(new Date(wd.createdAt), 'dd MMM yy, HH:mm') : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Withdraw modal */}
      <Modal isOpen={wdModal} onClose={() => setWdModal(false)} title="Withdraw Winning Coins">
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {wdWallet && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
              <p className="font-bold text-emerald-200">Withdrawing from: {wdWallet.subAdminName}</p>
              <p>🏆 Available Winning Coins: <strong className="text-emerald-300">₹{(wdWallet.winningBalance || 0).toLocaleString()}</strong></p>
              <p>🎮 Deposit Coins: ₹{(wdWallet.depositBalance || 0).toLocaleString()} (play only — not withdrawable)</p>
              <p className="text-slate-400">Purchased coins are for gameplay; all match winnings go to your Winning Wallet and can be withdrawn anytime (Min ₹200).</p>
            </div>
          )}

          <Input
            label={`Amount (coins = ₹) — Max ₹${wdWallet?.winningBalance || 0}`}
            type="number"
            min={1}
            max={wdWallet?.winningBalance || 0}
            value={wdForm.amountCoins}
            onChange={(e) => setWdForm({ ...wdForm, amountCoins: parseInt(e.target.value) || 0 })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Payout method</label>
            <div className="flex gap-2">
              {['upi', 'bank'].map((m) => (
                <button key={m} onClick={() => setWdForm({ ...wdForm, payoutMethod: m })}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all
                    ${wdForm.payoutMethod === m ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {m === 'upi' ? 'UPI' : 'Bank Transfer'}
                </button>
              ))}
            </div>
          </div>

          {wdForm.payoutMethod === 'upi' && (
            <Input label="Your UPI ID" placeholder="yourname@bank"
              value={wdForm.userUpiId}
              onChange={(e) => setWdForm({ ...wdForm, userUpiId: e.target.value })} />
          )}

          <Input label="Account holder name"
            value={wdForm.accountHolderName}
            onChange={(e) => setWdForm({ ...wdForm, accountHolderName: e.target.value })} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setWdModal(false)}>Cancel</Button>
            <Button loading={submitting} onClick={submitWithdrawal}
              disabled={!wdWallet || (wdWallet.winningBalance || 0) < wdForm.amountCoins}>
              <ArrowDownToLine size={16} /> Withdraw ₹{wdForm.amountCoins || 0}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
