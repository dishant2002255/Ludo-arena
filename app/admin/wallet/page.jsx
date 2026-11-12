'use client';
import { useEffect, useState } from 'react';
import { Coins, TrendingUp, TrendingDown, Trophy, Clock, CheckCircle, XCircle, Search, RefreshCw, Eye } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { StatSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_CONFIG = {
  pending:  { badge: 'yellow', icon: <Clock size={12} /> },
  approved: { badge: 'green',  icon: <CheckCircle size={12} /> },
  rejected: { badge: 'red',    icon: <XCircle size={12} /> },
};

export default function AdminWalletPage() {
  const [analytics, setAnalytics]     = useState(null);
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('pending');
  const [search, setSearch]           = useState('');
  const [reviewModal, setReviewModal] = useState(null); // { request, action: 'approve'|'reject' }
  const [remarks, setRemarks]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [detailModal, setDetailModal] = useState(null);

  useEffect(() => { fetchAll(); }, [filter, search]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        api.get('/admin/wallet/analytics'),
        api.get('/admin/coin-requests', { params: { status: filter || undefined, search: search || undefined } }),
      ]);
      setAnalytics(a.data.data);
      setRequests(r.data.data || []);
    } catch { toast.error('Failed to load wallet data'); }
    finally { setLoading(false); }
  };

  const openReview = (req, action) => {
    setReviewModal({ request: req, action });
    setRemarks('');
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const { request, action } = reviewModal;
      await api.patch(`/admin/coin-requests/${request._id}/${action}`, { remarks });
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setReviewModal(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const FILTERS = ['', 'pending', 'approved', 'rejected'];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Wallet Management</h1>
          <p className="text-slate-400 mt-1">Virtual coin analytics and request management</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={fetchAll} size="sm">Refresh</Button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <StatCard title="In Circulation"   value={(analytics?.totalInCirculation || 0).toLocaleString()} icon={<Coins size={20} />}       color="yellow" />
            <StatCard title="Granted"          value={(analytics?.coinsGranted || 0).toLocaleString()}       icon={<TrendingUp size={20} />}   color="green" />
            <StatCard title="Match Rewards"    value={(analytics?.coinsMatchWon || 0).toLocaleString()}      icon={<Trophy size={20} />}        color="purple" />
            <StatCard title="Consumed"         value={(analytics?.coinsConsumed || 0).toLocaleString()}      icon={<TrendingDown size={20} />} color="red" />
            <StatCard title="Refunded"         value={(analytics?.coinsRefunded || 0).toLocaleString()}      icon={<Coins size={20} />}         color="blue" />
            <StatCard title="Pending Requests" value={analytics?.pendingRequests || 0}                       icon={<Clock size={20} />}         color={analytics?.pendingRequests > 0 ? 'yellow' : 'gray'} />
          </>
        )}
      </div>

      {/* Recent Transactions */}
      {analytics?.recentTransactions?.length > 0 && (
        <div>
          <h2 className="section-title mb-4">Recent Platform Transactions</h2>
          <div className="game-card overflow-hidden">
            <div className="divide-y divide-white/5">
              {analytics.recentTransactions.map(tx => (
                <div key={tx._id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                      ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {tx.amount > 0 ? '+' : '−'}
                    </div>
                    <div>
                      <p className="text-white text-sm">{tx.user?.username || '—'}</p>
                      <p className="text-xs text-slate-500 capitalize">{tx.type?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-600">
                      {tx.createdAt ? formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Coin Requests */}
      <div>
        <h2 className="section-title mb-4">Coin Requests</h2>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Filter */}
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize
                  ${filter === f
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                {f || 'All'}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search by username..."
              icon={<Search size={14} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="game-card overflow-hidden">
          {loading ? <TableSkeleton /> : requests.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No {filter || ''} coin requests found
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['User', 'Amount', 'Reason', 'Status', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {requests.map(req => {
                  const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={req._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-white text-sm font-medium">{req.user?.username || '—'}</p>
                        <p className="text-xs text-slate-500">{req.user?.email || ''}</p>
                      </td>
                      <td className="px-5 py-4 text-yellow-400 font-bold text-sm">
                        {req.requestedAmount?.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-slate-300 text-sm max-w-xs">
                        <p className="line-clamp-2">{req.reason}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={sc.badge}>{sc.icon}<span className="ml-1 capitalize">{req.status}</span></Badge>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {req.createdAt ? format(new Date(req.createdAt), 'dd MMM yy') : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setDetailModal(req)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                            <Eye size={15} />
                          </button>
                          {req.status === 'pending' && (
                            <>
                              <button onClick={() => openReview(req, 'approve')}
                                className="px-3 py-1 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all">
                                Approve
                              </button>
                              <button onClick={() => openReview(req, 'reject')}
                                className="px-3 py-1 rounded-lg text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all">
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={reviewModal?.action === 'approve' ? '✅ Approve Coin Request' : '❌ Reject Coin Request'}
        size="sm"
      >
        {reviewModal && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">User</span>
                <span className="text-white font-medium">{reviewModal.request.user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Requested</span>
                <span className="text-yellow-400 font-bold">{reviewModal.request.requestedAmount?.toLocaleString()} coins</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Reason</span>
                <p className="text-white text-xs mt-1">{reviewModal.request.reason}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Admin Remarks (optional)</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="Add a note for the user..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setReviewModal(null)}>Cancel</Button>
              <Button
                variant={reviewModal.action === 'approve' ? 'success' : 'danger'}
                loading={submitting}
                onClick={submitReview}
              >
                {reviewModal.action === 'approve' ? 'Approve & Credit' : 'Reject Request'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Request Details" size="sm">
        {detailModal && (
          <div className="p-6 space-y-4 text-sm">
            {[
              ['User', detailModal.user?.username],
              ['Email', detailModal.user?.email],
              ['Amount', `${detailModal.requestedAmount?.toLocaleString()} coins`],
              ['Status', detailModal.status],
              ['Submitted', detailModal.createdAt ? format(new Date(detailModal.createdAt), 'dd MMM yyyy HH:mm') : '—'],
              ['Reviewed By', detailModal.reviewedBy?.username || '—'],
              ['Reviewed At', detailModal.reviewedAt ? format(new Date(detailModal.reviewedAt), 'dd MMM yyyy HH:mm') : '—'],
              ['Admin Remarks', detailModal.adminRemarks || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-slate-400 shrink-0">{label}</span>
                <span className="text-white text-right capitalize">{value}</span>
              </div>
            ))}
            <div className="pt-2">
              <span className="text-slate-400">Reason</span>
              <p className="text-white mt-1">{detailModal.reason}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
