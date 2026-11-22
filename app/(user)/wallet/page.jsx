'use client';
import { useEffect, useState } from 'react';
import { Trophy, ShoppingCart, ArrowDownToLine, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow, format } from 'date-fns';

const TX_LABEL = {
  coin_purchase:       '💳 UPI Purchase',
  battle_entry:        '⚔️ Battle Entry',
  battle_win:          '🏆 Battle Win',
  battle_refund:       '↩️ Battle Refund',
  withdrawal_lock:     '🔒 Withdrawal',
  withdrawal_approved: '✅ Payout Sent',
  withdrawal_refund:   '↩️ Withdrawal Refund',
  match_win:           '🏆 Match Win',
  tournament_reward:   '🥇 Tournament Win',
  admin_adjust:        '⚙️ Admin Adjustment',
  refund:              '↩️ Refund',
};

const WD_STATUS = {
  pending:  { label: 'Pending',  badge: 'yellow' },
  approved: { label: 'Paid ✓',  badge: 'green'  },
  rejected: { label: 'Refunded', badge: 'red'    },
};

function SubWalletCard({ wallet, onWithdraw }) {
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: '#fffdf5', border: '1.5px solid #e8d49a' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-black text-sm" style={{ color: '#3b2800' }}>{wallet.subAdminName}</p>
          <p className="text-xs" style={{ color: wallet.subAdminActive ? '#0a7a3c' : '#dc2626' }}>
            {wallet.subAdminActive ? '● Active' : '● Inactive'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: '#a09070' }}>Total</p>
          <p className="font-black text-lg" style={{ color: '#c9960a' }}>₹{(wallet.balance||0).toLocaleString()}</p>
        </div>
      </div>

      {/* Dual buckets */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-3 text-center" style={{ background: '#f0f4ff', border: '1px solid #c7d2fe' }}>
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <span style={{ color: '#4f46e5', fontSize: 13 }}>🎮</span>
            <p className="text-xs font-bold" style={{ color: '#4f46e5' }}>Deposit</p>
          </div>
          <p className="font-black text-lg" style={{ color: '#3730a3' }}>₹{(wallet.depositBalance||0).toLocaleString()}</p>
          <p className="text-[10px]" style={{ color: '#818cf8' }}>Play Only</p>
        </div>

        <div className="rounded-xl p-3 text-center" style={{ background: '#f0fdf4', border: '1px solid #a8dfc0' }}>
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Trophy size={11} style={{ color: '#0a7a3c' }} />
            <p className="text-xs font-bold" style={{ color: '#0a7a3c' }}>Winning</p>
          </div>
          <p className="font-black text-lg" style={{ color: '#0a7a3c' }}>₹{(wallet.winningBalance||0).toLocaleString()}</p>
          <p className="text-[10px]" style={{ color: '#7ecba4' }}>Withdrawable ✓</p>
        </div>
      </div>

      {/* Locked */}
      {(wallet.lockedBattleBalance > 0 || wallet.lockedWithdrawalBalance > 0) && (
        <div className="flex gap-2 mb-3 text-xs">
          {wallet.lockedBattleBalance > 0 && (
            <span className="px-2 py-1 rounded-full font-semibold"
              style={{ background: '#fff3c4', color: '#7a5a00', border: '1px solid #e8c84a' }}>
              🔒 ₹{wallet.lockedBattleBalance} in battle
            </span>
          )}
          {wallet.lockedWithdrawalBalance > 0 && (
            <span className="px-2 py-1 rounded-full font-semibold"
              style={{ background: '#fff3c4', color: '#7a5a00', border: '1px solid #e8c84a' }}>
              🔒 ₹{wallet.lockedWithdrawalBalance} withdrawing
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Link href={`/battles?subAdminId=${wallet.subAdminId}`} className="flex-1">
          <button className="w-full py-2 rounded-full text-xs font-bold"
            style={{ background: '#f0e6c8', color: '#7a5a00', border: '1.5px solid #e8d49a' }}>
            ⚔️ Play Battles
          </button>
        </Link>
        <button
          disabled={!wallet.winningBalance || wallet.winningBalance <= 0}
          onClick={() => onWithdraw(wallet)}
          className="px-5 py-2 rounded-full text-xs font-bold disabled:opacity-40"
          style={{ background: 'linear-gradient(to bottom,#2ecc71,#0a7a3c)', color: '#fff', boxShadow: '0 2px 8px rgba(10,122,60,0.25)' }}>
          Withdraw
        </button>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { user, refreshUser } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [subWallets, setSubWallets]  = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading]        = useState(true);
  const [tab, setTab]                = useState('wallets');
  const [wdModal, setWdModal]        = useState(false);
  const [wdWallet, setWdWallet]      = useState(null);
  const [wdForm, setWdForm]          = useState({ amountCoins: 200, payoutMethod: 'upi', userUpiId: '', accountHolderName: '' });
  const [submitting, setSubmitting]  = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [t, sw, wd] = await Promise.all([
        api.get('/wallet/history?limit=30'),
        api.get('/wallet/my-sub-wallets'),
        api.get('/withdrawals/mine'),
      ]);
      setTransactions(t.data.data || []);
      setSubWallets(sw.data.data || []);
      setWithdrawals(wd.data.data || []);
    } catch { toast.error('Failed to load wallet'); }
    finally { setLoading(false); }
  };

  const openWithdrawModal = (wallet) => {
    setWdWallet(wallet);
    setWdForm({ amountCoins: Math.min(200, wallet.winningBalance || 0), payoutMethod: 'upi', userUpiId: '', accountHolderName: '' });
    setWdModal(true);
  };

  const submitWithdrawal = async () => {
    if (!wdWallet) return;
    if ((wdWallet.winningBalance || 0) < wdForm.amountCoins) {
      toast.error(`Withdrawable: ₹${wdWallet.winningBalance || 0} only`);
      return;
    }
    if (wdForm.payoutMethod === 'upi' && !wdForm.userUpiId.includes('@')) {
      toast.error('Enter valid UPI ID (name@bank)');
      return;
    }
    if (!wdForm.accountHolderName.trim()) { toast.error('Enter account holder name'); return; }
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
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const totalDeposit  = subWallets.reduce((s, w) => s + (w.depositBalance || 0), 0);
  const totalWinning  = subWallets.reduce((s, w) => s + (w.winningBalance || 0), 0);

  const TABS = [
    ['wallets',      '💼 Wallets'],
    ['transactions', '📋 History'],
    ['withdrawals',  '💸 Withdrawals'],
  ];

  return (
    <div className="animate-fade-in space-y-4">

      {/* Total balance summary */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#fff3c4,#fde68a)', border: '1.5px solid #e8c84a' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#7a5a00' }}>Total Balance</p>
        <p className="font-black text-3xl" style={{ color: '#3b2800' }}>₹{(totalDeposit + totalWinning).toLocaleString()}</p>
        <div className="flex gap-4 mt-2">
          <div>
            <p className="text-[10px]" style={{ color: '#7a5a00' }}>🎮 Deposit</p>
            <p className="font-bold text-sm" style={{ color: '#5b21b6' }}>₹{totalDeposit.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: '#7a5a00' }}>🏆 Winning</p>
            <p className="font-bold text-sm" style={{ color: '#0a7a3c' }}>₹{totalWinning.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-[10px] mt-2" style={{ color: '#a09070' }}>
          Winning coins only are withdrawable. Deposit coins are for gameplay.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/buy-coins">
          <div className="rounded-2xl p-3.5 flex items-center gap-3 active:scale-98 transition-transform"
            style={{ background: '#fffdf5', border: '1.5px solid #e8d49a' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)' }}>
              <ShoppingCart size={18} style={{ color: '#3b2800' }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: '#3b2800' }}>Buy Coins</p>
              <p className="text-xs" style={{ color: '#a09070' }}>via UPI</p>
            </div>
          </div>
        </Link>
        <div className="rounded-2xl p-3.5 flex items-center gap-3 active:scale-98 transition-transform cursor-pointer"
          style={{ background: '#fffdf5', border: '1.5px solid #e8d49a' }}
          onClick={() => { const w = subWallets.find(w => (w.winningBalance||0) > 0); if(w) openWithdrawModal(w); else toast.error('No winning balance to withdraw'); }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(to bottom,#2ecc71,#0a7a3c)' }}>
            <ArrowDownToLine size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#3b2800' }}>Withdraw</p>
            <p className="text-xs" style={{ color: '#a09070' }}>Winning only</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: '#f0e6c8' }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={tab === key
              ? { background: '#fffdf5', color: '#c9960a', boxShadow: '0 1px 4px rgba(201,150,10,0.15)' }
              : { color: '#a09070' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Wallets tab */}
      {tab === 'wallets' && (
        loading ? (
          <div className="text-center py-8"><div className="w-7 h-7 rounded-full border-4 border-[#e8d49a] border-t-[#c9960a] animate-spin mx-auto" /></div>
        ) : subWallets.length === 0 ? (
          <div className="text-center py-10 rounded-2xl" style={{ background: '#f5e9c8', border: '1.5px dashed #e8d49a' }}>
            <p className="font-bold text-sm mb-1" style={{ color: '#7a5a00' }}>No wallets yet</p>
            <Link href="/buy-coins" className="text-xs underline font-semibold" style={{ color: '#c9960a' }}>Buy coins from a Sub-Admin →</Link>
          </div>
        ) : (
          subWallets.map(w => <SubWalletCard key={w.subAdminId} wallet={w} onWithdraw={openWithdrawModal} />)
        )
      )}

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e8d49a' }}>
          {loading ? (
            <div className="text-center py-8"><div className="w-7 h-7 rounded-full border-4 border-[#e8d49a] border-t-[#c9960a] animate-spin mx-auto" /></div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10" style={{ color: '#a09070' }}>No transactions yet</div>
          ) : (
            transactions.map((tx, i) => (
              <div key={tx._id} className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid #f0e6c8' : 'none', background: '#fffdf5' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
                    style={tx.amount > 0 ? { background: '#d1fae5', color: '#0a7a3c' } : { background: '#fee2e2', color: '#dc2626' }}>
                    {tx.amount > 0 ? '+' : '−'}
                  </div>
                  <div>
                    <p className="font-semibold text-xs" style={{ color: '#3b2800' }}>
                      {TX_LABEL[tx.type] || tx.type}
                    </p>
                    <p className="text-[10px]" style={{ color: '#a09070' }}>
                      {tx.createdAt ? formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true }) : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm" style={{ color: tx.amount > 0 ? '#0a7a3c' : '#dc2626' }}>
                    {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                  </p>
                  <p className="text-[10px]" style={{ color: '#a09070' }}>Bal: ₹{tx.balanceAfter?.toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Withdrawals tab */}
      {tab === 'withdrawals' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e8d49a' }}>
          {loading ? (
            <div className="text-center py-8"><div className="w-7 h-7 rounded-full border-4 border-[#e8d49a] border-t-[#c9960a] animate-spin mx-auto" /></div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-10" style={{ color: '#a09070' }}>No withdrawals yet</div>
          ) : (
            withdrawals.map((wd, i) => {
              const st = WD_STATUS[wd.status] || WD_STATUS.pending;
              return (
                <div key={wd._id} className="px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid #f0e6c8' : 'none', background: '#fffdf5' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm" style={{ color: '#3b2800' }}>
                        ₹{wd.amountRupees?.toLocaleString()}
                      </p>
                      <p className="text-xs" style={{ color: '#a09070' }}>
                        {wd.payoutMethod?.toUpperCase()} → {wd.userUpiId || 'bank'}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: '#c0a070' }}>{wd.withdrawalReference}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={st.badge}>{st.label}</Badge>
                      {wd.utrReference && <p className="text-[10px] mt-1" style={{ color: '#0a7a3c' }}>UTR: {wd.utrReference}</p>}
                      <p className="text-[10px] mt-0.5" style={{ color: '#a09070' }}>
                        {wd.createdAt ? format(new Date(wd.createdAt), 'dd MMM yy') : ''}
                      </p>
                    </div>
                  </div>
                  {wd.adminRemarks && (
                    <p className="text-[10px] mt-1 italic" style={{ color: '#dc2626' }}>Note: {wd.adminRemarks}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Withdraw modal */}
      <Modal isOpen={wdModal} onClose={() => setWdModal(false)} title="Withdraw Winning Coins">
        <div className="p-5 space-y-4">
          {wdWallet && (
            <div className="rounded-xl p-3 text-xs" style={{ background: '#f0fdf4', border: '1px solid #a8dfc0', color: '#1a3c24' }}>
              <p className="font-bold">From: {wdWallet.subAdminName}</p>
              <p>🏆 Withdrawable Winning: <strong>₹{wdWallet.winningBalance || 0}</strong></p>
              <p className="text-[11px] mt-1" style={{ color: '#7ecba4' }}>
                Deposit ₹{wdWallet.depositBalance||0} is play-only. Win battles to earn withdrawable coins.
              </p>
            </div>
          )}

          <Input label={`Amount (Max ₹${wdWallet?.winningBalance || 0})`}
            type="number" min={1} max={wdWallet?.winningBalance || 0}
            value={wdForm.amountCoins}
            onChange={e => setWdForm({...wdForm, amountCoins: parseInt(e.target.value)||0})} />

          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: '#7a5a00' }}>Payout Method</label>
            <div className="grid grid-cols-2 gap-2">
              {['upi','bank'].map(m => (
                <button key={m} onClick={() => setWdForm({...wdForm, payoutMethod:m})}
                  className="py-2.5 rounded-xl font-bold text-sm transition-all"
                  style={wdForm.payoutMethod===m
                    ? {background:'linear-gradient(to bottom,#f5c842,#c9960a)',color:'#3b2800'}
                    : {background:'#f0e6c8',color:'#7a5a00',border:'1px solid #e8d49a'}}>
                  {m==='upi' ? '📱 UPI' : '🏦 Bank'}
                </button>
              ))}
            </div>
          </div>

          {wdForm.payoutMethod === 'upi' && (
            <Input label="Your UPI ID" placeholder="name@bank"
              value={wdForm.userUpiId}
              onChange={e => setWdForm({...wdForm, userUpiId:e.target.value})} />
          )}

          <Input label="Account Holder Name"
            value={wdForm.accountHolderName}
            onChange={e => setWdForm({...wdForm, accountHolderName:e.target.value})} />

          <button onClick={submitWithdrawal} disabled={submitting || !wdWallet || (wdWallet.winningBalance||0) < wdForm.amountCoins}
            className="w-full py-3.5 rounded-full font-black text-sm active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: 'linear-gradient(to bottom,#2ecc71,#0a7a3c)', color: '#fff', boxShadow: '0 3px 12px rgba(10,122,60,0.3)' }}>
            {submitting ? 'Processing…' : `💸 Withdraw ₹${wdForm.amountCoins}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
