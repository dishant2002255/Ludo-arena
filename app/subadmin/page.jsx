'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, CreditCard, ArrowDownToLine, Swords, Settings, RefreshCw, Loader2,
  Check, X, Eye, Scale,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow, format } from 'date-fns';

function Panel() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuthStore();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [loading, setLoading] = useState(true);

  // Overview
  const [metrics, setMetrics] = useState(null);

  // Payments
  const [orders, setOrders] = useState([]);

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState([]);
  const [wdModal, setWdModal] = useState(null); // { withdrawal, action }
  const [utr, setUtr] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  // Battles
  const [battles, setBattles] = useState([]);
  const [battleModal, setBattleModal] = useState(null);
  const [winnerId, setWinnerId] = useState('');
  const [battleRemarks, setBattleRemarks] = useState('');

  // UPI settings
  const [upi, setUpi] = useState({ upiEnabled: false, upiId: '', upiName: '', upiNote: '' });
  const [upiBusy, setUpiBusy] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, p, w, b, me] = await Promise.all([
        api.get('/sub-admin/me/audit'),
        api.get('/payment/admin/pending'),
        api.get('/withdrawals?status=pending'),
        api.get('/battles/admin/all'),
        api.get('/sub-admin/me'),
      ]);
      setMetrics(m.data.data);
      setOrders(p.data.data || []);
      setWithdrawals(w.data.data || []);
      setBattles(b.data.data || []);
      const info = me.data.data?.subAdmin?.subAdminInfo;
      if (info) setUpi({
        upiEnabled: !!info.upiEnabled, upiId: info.upiId || '',
        upiName: info.upiName || '', upiNote: info.upiNote || '',
      });
    } catch {
      toast.error('Failed to load panel data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Real-time alarms
  useEffect(() => {
    const socket = (async () => { const { connectSocket } = await import('@/lib/socket/socket'); return connectSocket(); })();
    let s;
    socket.then((sock) => {
      s = sock;
      s.on('payment:alarm', () => { toast.warning('New payment order!'); fetchAll(); });
      s.on('withdrawal:new', () => { toast.warning('New withdrawal request!'); fetchAll(); });
      s.on('battle:disputed', () => { toast.warning('Battle dispute!'); fetchAll(); });
    });
    return () => { if (s) { s.off('payment:alarm'); s.off('withdrawal:new'); s.off('battle:disputed'); } };
  }, [fetchAll]);

  const reviewPayment = async (orderId, action) => {
    setBusy(true);
    try {
      const url = action === 'approve'
        ? `/payment/admin/${orderId}/approve`
        : `/payment/admin/${orderId}/reject`;
      const { data } = await api.patch(url, { adminRemarks: remarks || '' });
      toast.success(data.message);
      setWdModal(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const reviewWithdrawal = async () => {
    if (!wdModal) return;
    setBusy(true);
    try {
      const url = wdModal.action === 'approve'
        ? `/withdrawals/${wdModal.withdrawal._id}/approve`
        : `/withdrawals/${wdModal.withdrawal._id}/reject`;
      const payload = wdModal.action === 'approve'
        ? { utrReference: utr, adminRemarks: remarks }
        : { adminRemarks: remarks };
      const { data } = await api.patch(url, payload);
      toast.success(data.message);
      setWdModal(null);
      setUtr(''); setRemarks('');
      await refreshUser();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const resolveBattle = async (decision) => {
    if (!battleModal) return;
    if (decision === 'winner' && !winnerId) { toast.error('Select a winner'); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/battles/${battleModal._id}/resolve`, {
        decision, winnerId: winnerId || undefined, remarks: battleRemarks || '',
      });
      toast.success(data.message);
      setBattleModal(null);
      setWinnerId(''); setBattleRemarks('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const saveUpi = async () => {
    setUpiBusy(true);
    try {
      const { data } = await api.patch('/sub-admin/me/upi', upi);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setUpiBusy(false);
    }
  };

  const TABS = [
    ['overview', 'Overview', <LayoutDashboard size={16} key="o" />],
    ['payments', `Payments (${orders.length})`, <CreditCard size={16} key="p" />],
    ['withdrawals', `Withdrawals (${withdrawals.length})`, <ArrowDownToLine size={16} key="w" />],
    ['battles', `Battles (${battles.length})`, <Swords size={16} key="b" />],
    ['settings', 'UPI Settings', <Settings size={16} key="s" />],
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Sub-Admin Panel</h1>
          <p className="text-slate-400 mt-1">
            {user?.subAdminInfo?.displayName || user?.username} · 1 coin = ₹1
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={fetchAll} size="sm">Refresh</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(([key, label, icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2
              ${tab === key ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {loading ? <TableSkeleton /> : (
        <>
          {/* ─── OVERVIEW ─────────────────────────────────────────── */}
          {tab === 'overview' && metrics && (
            <div className="space-y-6">
              <div className={`p-5 rounded-xl border ${metrics.auditBalanced ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/40'}`}>
                <p className={`font-bold ${metrics.auditBalanced ? 'text-emerald-300' : 'text-red-300'}`}>
                  {metrics.auditBalanced ? '✓ Ledger balanced' : `✗ DISCREPANCY: ${metrics.discrepancyDelta}`}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Net issued {metrics.netCoinsIssued} = stock {metrics.coinStock} + user balances {metrics.activeUserBalances} + escrow {metrics.activeEscrow} + commission {metrics.totalCommissionEarned}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Coin stock', metrics.coinStock, 'yellow'],
                  ['Approved deposits ₹', metrics.totalApprovedDepositsRupees, 'green'],
                  ['Approved withdrawals ₹', metrics.totalApprovedWithdrawalsRupees, 'red'],
                  ['Cash in hand ₹', metrics.netCashInHandRupees, 'blue'],
                ].map(([label, val]) => (
                  <div key={label} className="game-card p-4">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-2xl font-bold text-white">{Number(val).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── PAYMENTS ─────────────────────────────────────────── */}
          {tab === 'payments' && (
            orders.length === 0 ? (
              <div className="game-card p-12 text-center text-slate-400">No pending payments</div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o._id} className="game-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-semibold">
                        {o.user?.username} — ₹{o.amountRupees} for {o.coinsRequested} coins
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{o.orderReference} · {o.upiPlatform}</p>
                      <p className="text-xs text-slate-600">
                        {o.createdAt ? formatDistanceToNow(new Date(o.createdAt), { addSuffix: true }) : ''}
                        {o.screenshotUrl && (
                          <> · <a href={o.screenshotUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline">view screenshot</a></>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" icon={<Check size={14} />}
                        onClick={() => { setWdModal({ kind: 'payment', order: o, action: 'approve' }); setRemarks(''); }}>Approve</Button>
                      <Button size="sm" variant="danger" icon={<X size={14} />}
                        onClick={() => { setWdModal({ kind: 'payment', order: o, action: 'reject' }); setRemarks(''); }}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── WITHDRAWALS ──────────────────────────────────────── */}
          {tab === 'withdrawals' && (
            withdrawals.length === 0 ? (
              <div className="game-card p-12 text-center text-slate-400">No pending withdrawals</div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w._id} className="game-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-semibold">
                        {w.user?.username} — ₹{w.amountRupees} ({w.amountCoins} coins)
                      </p>
                      <p className="text-xs text-slate-400">Pay to {w.payoutMethod?.toUpperCase()}: {w.userUpiId || `${w.bankAccountNumber} (${w.bankIfsc})`}</p>
                      <p className="text-xs text-slate-500">Holder: {w.accountHolderName} · <span className="font-mono">{w.withdrawalReference}</span></p>
                      <p className="text-xs text-slate-600">
                        {w.createdAt ? formatDistanceToNow(new Date(w.createdAt), { addSuffix: true }) : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="success"
                        onClick={() => { setWdModal({ kind: 'withdrawal', withdrawal: w, action: 'approve' }); setUtr(''); setRemarks(''); }}>
                        <Check size={14} /> Paid
                      </Button>
                      <Button size="sm" variant="danger"
                        onClick={() => { setWdModal({ kind: 'withdrawal', withdrawal: w, action: 'reject' }); setRemarks(''); }}>
                        <X size={14} /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── BATTLES ──────────────────────────────────────────── */}
          {tab === 'battles' && (
            battles.length === 0 ? (
              <div className="game-card p-12 text-center text-slate-400">No battles awaiting verification</div>
            ) : (
              <div className="space-y-3">
                {battles.map((b) => (
                  <div key={b._id} className="game-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-semibold">
                        <span className="font-mono text-xs text-slate-500">{b.battleCode}</span> · {b.entryCoins} coins entry
                      </p>
                      <p className="text-xs text-slate-400">
                        {b.participants.length} players · prize {b.winningPrize} · commission {b.commissionCoins}
                      </p>
                      <p className="text-xs text-slate-500">
                        Status: <Badge variant={b.status === 'disputed' ? 'red' : 'yellow'}>{b.status}</Badge>
                      </p>
                    </div>
                    <Button size="sm" icon={<Scale size={14} />}
                      onClick={async () => {
                        setWinnerId(''); setBattleRemarks('');
                        try {
                          const { data } = await api.get(`/battles/admin/${b._id}`);
                          setBattleModal(data.data.battle);
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Failed to load battle');
                        }
                      }}>
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── UPI SETTINGS ────────────────────────────────────── */}
          {tab === 'settings' && (
            <div className="game-card p-6 max-w-lg space-y-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={upi.upiEnabled}
                  onChange={(e) => setUpi({ ...upi, upiEnabled: e.target.checked })} />
                Accept UPI payments from users
              </label>
              <Input label="UPI ID" placeholder="name@bank" value={upi.upiId}
                onChange={(e) => setUpi({ ...upi, upiId: e.target.value })} />
              <Input label="UPI holder name" value={upi.upiName}
                onChange={(e) => setUpi({ ...upi, upiName: e.target.value })} />
              <Input label="Payment note" value={upi.upiNote}
                onChange={(e) => setUpi({ ...upi, upiNote: e.target.value })} />
              <Button loading={upiBusy} onClick={saveUpi}>Save UPI Settings</Button>
            </div>
          )}
        </>
      )}

      {/* Payment / Withdrawal review modal */}
      <Modal isOpen={!!wdModal} onClose={() => setWdModal(null)}
        title={wdModal?.action === 'approve' ? 'Approve' : 'Reject'}>
        <div className="p-6 space-y-4">
          {wdModal?.kind === 'withdrawal' && wdModal?.action === 'approve' && (
            <Input
              label="UTR / reference number *"
              placeholder="from your UPI app"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              hint="Approving returns the coins to your stock and pays the user ₹1/coin"
            />
          )}
          {wdModal?.action === 'reject' && (
            <Input
              label="Reason (required for rejection)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              hint="Rejection refunds the coins to the user"
            />
          )}
          {wdModal?.kind === 'payment' && wdModal?.action === 'approve' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              Verify the ₹{wdModal.order.amountRupees} payment in your bank/UPI app before approving.
              {wdModal.order.coinsRequested} coins will be deducted from your stock and credited to {wdModal.order.user?.username}.
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setWdModal(null)}>Cancel</Button>
            <Button
              loading={busy}
              variant={wdModal?.action === 'approve' ? 'success' : 'danger'}
              onClick={() => {
                if (wdModal.kind === 'payment') reviewPayment(wdModal.order._id, wdModal.action);
                else reviewWithdrawal();
              }}
            >
              {wdModal?.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Battle resolve modal */}
      <Modal isOpen={!!battleModal} onClose={() => setBattleModal(null)} title={`Resolve ${battleModal?.battleCode}`}>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">Select winner</p>
            {(battleModal?.participants || []).map((p) => {
              const uid = typeof p.user === 'object' ? p.user?._id : p.user;
              const uname = typeof p.user === 'object' ? p.user?.username : 'Player';
              return (
                <button key={uid}
                  onClick={() => setWinnerId(uid)}
                  className={`w-full p-3 rounded-xl border text-left transition-all
                    ${winnerId === uid ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-white/5 border-white/10'}`}>
                  <p className="text-white text-sm font-semibold">{uname}</p>
                  <p className="text-xs text-slate-500">
                    Claim: {p.submission?.claim || 'none'}
                    {p.submission?.screenshotUrl && (
                      <> · <a href={p.submission.screenshotUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline">screenshot</a></>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
          <Input label="Remarks" value={battleRemarks} onChange={(e) => setBattleRemarks(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="danger" loading={busy} onClick={() => resolveBattle('cancel')}>
              Cancel & refund all
            </Button>
            <Button variant="success" loading={busy} disabled={!winnerId} onClick={() => resolveBattle('winner')}>
              Declare winner
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function SubAdminPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Panel />
    </Suspense>
  );
}
