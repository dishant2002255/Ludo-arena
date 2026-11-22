'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  UserCog, Plus, Coins, ArrowDown, ShieldCheck, ShieldOff, RefreshCw, Loader2, Scale, Users,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';
import { format } from 'date-fns';

export default function SubAdminsPage() {
  const [subAdmins, setSubAdmins]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [form, setForm]               = useState({
    username: '', email: '', password: '', displayName: '',
    upiId: '', upiName: '', upiEnabled: false, commissionPercentOverride: '', initialCoins: 10000,
  });
  const [coinsModal, setCoinsModal]   = useState(null); // { subAdmin, mode: 'issue' | 'deduct' }
  const [coinsForm, setCoinsForm]    = useState({ amount: 1000, remarks: '' });
  const [coinsBusy, setCoinsBusy]    = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSubAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sub-admin?limit=100');
      setSubAdmins(data.data || []);
    } catch {
      toast.error('Failed to load Sub-Admins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubAdmins(); }, [fetchSubAdmins]);

  const createSubAdmin = async () => {
    if (form.username.length < 3 || !form.email || form.password.length < 8) {
      toast.error('Fill username, email and a password (min 8 chars)');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        ...form,
        commissionPercentOverride: form.commissionPercentOverride === '' ? null : Number(form.commissionPercentOverride),
        initialCoins: Number(form.initialCoins) || 0,
      };
      const { data } = await api.post('/sub-admin', payload);
      toast.success(data.message);
      setCreateModal(false);
      setForm({ username: '', email: '', password: '', displayName: '', upiId: '', upiName: '', upiEnabled: false, commissionPercentOverride: '', initialCoins: 10000 });
      fetchSubAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create Sub-Admin');
    } finally {
      setCreating(false);
    }
  };

  const openCoins = (subAdmin, mode) => {
    setCoinsModal({ subAdmin, mode });
    setCoinsForm({ amount: 1000, remarks: '' });
  };

  const submitCoins = async () => {
    const { subAdmin, mode } = coinsModal;
    if (!coinsForm.amount || coinsForm.amount < 1) { toast.error('Enter a positive amount'); return; }
    setCoinsBusy(true);
    try {
      const url = mode === 'issue'
        ? `/sub-admin/${subAdmin._id}/issue-coins`
        : `/sub-admin/${subAdmin._id}/deduct-coins`;
      const { data } = await api.post(url, coinsForm);
      toast.success(data.message);
      setCoinsModal(null);
      fetchSubAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setCoinsBusy(false);
    }
  };

  const toggleActive = async (sa) => {
    try {
      const { data } = await api.patch(`/sub-admin/${sa._id}/toggle-active`);
      toast.success(data.message);
      fetchSubAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const openDetail = async (sa) => {
    setDetailModal(sa);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/sub-admin/${sa._id}`);
      setDetailModal(data.data.subAdmin);
      // attach metrics
      setDetailModal((prev) => ({ ...prev, __metrics: data.data.metrics, __ledger: data.data.recentLedger, __withdrawals: data.data.recentWithdrawals }));
    } catch {
      toast.error('Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
            <UserCog size={28} className="text-indigo-400" /> Sub-Admins
          </h1>
          <p className="text-slate-400 mt-1">Real-money managers — each holds a revolving coin stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={fetchSubAdmins} size="sm">Refresh</Button>
          <Button icon={<Plus size={16} />} onClick={() => setCreateModal(true)} size="sm">Create Sub-Admin</Button>
        </div>
      </div>

      {loading ? <TableSkeleton /> : subAdmins.length === 0 ? (
        <div className="game-card p-12 text-center text-slate-400">
          <UserCog size={40} className="mx-auto mb-3 text-slate-600" />
          No Sub-Admins yet. Create one to start accepting UPI purchases.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {subAdmins.map((sa) => {
            const info = sa.subAdminInfo || {};
            return (
              <div key={sa._id} className="game-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-bold">{info.displayName || sa.username}</p>
                    <p className="text-xs text-slate-500">{sa.username} · {sa.email}</p>
                  </div>
                  <Badge variant={info.isActive ? 'green' : 'red'}>
                    {info.isActive ? 'Active' : 'Suspended'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-500">Coin stock</p>
                    <p className="text-yellow-400 font-bold text-sm">{(info.coinStock || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-500">Sold</p>
                    <p className="text-slate-300 font-bold text-sm">{(info.totalCoinsSold || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-500">Commission</p>
                    <p className="text-emerald-400 font-bold text-sm">{(info.totalCommissionEarned || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className={info.upiEnabled ? 'text-emerald-400' : 'text-slate-600'}>
                    {info.upiEnabled ? `UPI: ${info.upiId}` : 'UPI not enabled'}
                  </span>
                  {info.commissionPercentOverride != null && <span>· override {info.commissionPercentOverride}%</span>}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" icon={<Coins size={14} />} onClick={() => openCoins(sa, 'issue')}>Issue</Button>
                  <Button size="sm" variant="secondary" icon={<ArrowDown size={14} />} onClick={() => openCoins(sa, 'deduct')}>Deduct</Button>
                  <Button size="sm" variant="secondary" icon={<Scale size={14} />} onClick={() => openDetail(sa)}>Audit</Button>
                  <Button
                    size="sm"
                    variant={info.isActive ? 'danger' : 'success'}
                    icon={info.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                    onClick={() => toggleActive(sa)}
                  >
                    {info.isActive ? 'Suspend' : 'Activate'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Sub-Admin" size="lg">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input label="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password (min 8 chars)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="UPI ID (name@bank)" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} />
            <Input label="UPI holder name" value={form.upiName} onChange={(e) => setForm({ ...form, upiName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Commission % override (blank = default)"
              type="number"
              value={form.commissionPercentOverride}
              onChange={(e) => setForm({ ...form, commissionPercentOverride: e.target.value })}
            />
            <Input
              label="Initial coin stock"
              type="number"
              value={form.initialCoins}
              onChange={(e) => setForm({ ...form, initialCoins: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.upiEnabled} onChange={(e) => setForm({ ...form, upiEnabled: e.target.checked })} />
            Enable UPI payments immediately
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button loading={creating} onClick={createSubAdmin}>Create Sub-Admin</Button>
          </div>
        </div>
      </Modal>

      {/* Coins modal */}
      <Modal isOpen={!!coinsModal} onClose={() => setCoinsModal(null)}
        title={coinsModal?.mode === 'issue' ? `Issue coins to ${coinsModal?.subAdmin?.username}` : `Deduct coins from ${coinsModal?.subAdmin?.username}`}>
        <div className="p-6 space-y-4">
          <Input
            label="Amount (coins)"
            type="number"
            min={1}
            value={coinsForm.amount}
            onChange={(e) => setCoinsForm({ ...coinsForm, amount: parseInt(e.target.value) || 0 })}
            hint={coinsModal ? `Current stock: ${(coinsModal.subAdmin.subAdminInfo?.coinStock || 0).toLocaleString()}` : ''}
          />
          <Input
            label="Remarks"
            value={coinsForm.remarks}
            onChange={(e) => setCoinsForm({ ...coinsForm, remarks: e.target.value })}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCoinsModal(null)}>Cancel</Button>
            <Button loading={coinsBusy} onClick={submitCoins} variant={coinsModal?.mode === 'issue' ? 'primary' : 'danger'}>
              {coinsModal?.mode === 'issue' ? 'Issue Coins' : 'Deduct Coins'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Audit modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Audit — ${detailModal?.username || ''}`} size="lg">
        <div className="p-6 space-y-4">
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-400" /></div>
          ) : detailModal?.__metrics ? (
            <>
              <div className={`p-4 rounded-xl border ${detailModal.__metrics.auditBalanced ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/40'}`}>
                <p className={`font-bold ${detailModal.__metrics.auditBalanced ? 'text-emerald-300' : 'text-red-300'}`}>
                  {detailModal.__metrics.auditBalanced
                    ? '✓ Anti-cheat equation balanced'
                    : `✗ DISCREPANCY: delta ${detailModal.__metrics.discrepancyDelta}`}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Net issued: {detailModal.__metrics.netCoinsIssued} = stock {detailModal.__metrics.coinStock}
                  {' + '}balances {detailModal.__metrics.activeUserBalances}
                  {' + '}escrow {detailModal.__metrics.activeEscrow}
                  {' + '}commission {detailModal.__metrics.totalCommissionEarned}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {[
                  ['Deposits ₹', detailModal.__metrics.totalApprovedDepositsRupees],
                  ['Withdrawals ₹', detailModal.__metrics.totalApprovedWithdrawalsRupees],
                  ['Cash in hand ₹', detailModal.__metrics.netCashInHandRupees],
                  ['Users', detailModal.__metrics.activeUserBalances],
                ].map(([label, val]) => (
                  <div key={label} className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-500">{label}</p>
                    <p className="text-white font-bold">{Number(val).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-2">Recent ledger</p>
                <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
                  {(detailModal.__ledger || []).map((l) => (
                    <div key={l._id} className="py-2 flex justify-between text-xs">
                      <span className="text-slate-400">{l.type} · {l.remarks}</span>
                      <span className={l.amount < 0 ? 'text-red-400' : 'text-emerald-400'}>{l.amount > 0 ? '+' : ''}{l.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-sm">No metrics available</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
