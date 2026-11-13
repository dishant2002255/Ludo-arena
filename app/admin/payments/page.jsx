'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, CheckCircle, XCircle, Bell, BellOff, RefreshCw, Clock, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import Avatar from '@/components/ui/Avatar';
import api from '@/lib/api/axios';
import { connectSocket } from '@/lib/socket/socket';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow, format } from 'date-fns';

const UPI_LABELS = { gpay:'Google Pay', phonepe:'PhonePe', paytm:'Paytm', bhim:'BHIM', other:'UPI' };
const STATUS_BADGE = { pending:'yellow', admin_notified:'purple', approved:'green', rejected:'red', expired:'gray' };

export default function AdminPaymentsPage() {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('');
  const [reviewModal, setReviewModal] = useState(null); // { order, action }
  const [remarks, setRemarks]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [detailModal, setDetailModal] = useState(null);

  // ── Persistent Alarm ────────────────────────────────────────────────────────
  const [alarms, setAlarms]           = useState({}); // { orderId: alarmData }
  const [alarmMuted, setAlarmMuted]   = useState(false);
  const audioCtxRef                   = useRef(null);
  const alarmIntervalRef              = useRef(null);

  const startAlarmSound = useCallback(() => {
    if (alarmMuted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      /**
       * Plays one "ring" burst — sounds like a mobile phone ringing.
       * Pattern: two-tone melody repeated inside each ring burst.
       *   Ring (2s) — Silence (1s) — Ring (2s) — Silence (1s) — repeat
       *
       * Uses two oscillators for a richer, warmer phone ring sound:
       * - Main tone with vibrato (frequency modulation)
       * - Harmony note slightly above
       */
      const playRingBurst = (startTime) => {
        const ringDuration = 2.0;   // seconds ring plays
        // silence gap handled by the interval scheduling

        // ── Note 1: Main tone ~880Hz (A5) with vibrato ────────────────────
        const osc1  = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const lfo1  = ctx.createOscillator();   // vibrato LFO
        const lfoG1 = ctx.createGain();

        lfo1.frequency.value  = 8;              // vibrato speed: 8 Hz
        lfoG1.gain.value      = 25;             // vibrato depth: ±25 Hz
        lfo1.connect(lfoG1);
        lfoG1.connect(osc1.frequency);

        osc1.type             = 'sine';
        osc1.frequency.value  = 880;

        // Volume envelope: quick attack, sustain, quick release
        gain1.gain.setValueAtTime(0, startTime);
        gain1.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
        gain1.gain.setValueAtTime(0.4, startTime + ringDuration - 0.1);
        gain1.gain.linearRampToValueAtTime(0, startTime + ringDuration);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        lfo1.start(startTime);
        osc1.start(startTime);
        lfo1.stop(startTime + ringDuration);
        osc1.stop(startTime + ringDuration);

        // ── Note 2: Harmony ~1109Hz (C#6) — adds brightness ──────────────
        const osc2  = ctx.createOscillator();
        const gain2 = ctx.createGain();
        const lfo2  = ctx.createOscillator();
        const lfoG2 = ctx.createGain();

        lfo2.frequency.value  = 8;
        lfoG2.gain.value      = 20;
        lfo2.connect(lfoG2);
        lfoG2.connect(osc2.frequency);

        osc2.type             = 'sine';
        osc2.frequency.value  = 1109;

        gain2.gain.setValueAtTime(0, startTime);
        gain2.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gain2.gain.setValueAtTime(0.2, startTime + ringDuration - 0.1);
        gain2.gain.linearRampToValueAtTime(0, startTime + ringDuration);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        lfo2.start(startTime);
        osc2.start(startTime);
        lfo2.stop(startTime + ringDuration);
        osc2.stop(startTime + ringDuration);

        // ── Note 3: Sub bass hit at start for punch ───────────────────────
        const sub  = ctx.createOscillator();
        const subG = ctx.createGain();
        sub.type            = 'sine';
        sub.frequency.value = 220;
        subG.gain.setValueAtTime(0.15, startTime);
        subG.gain.linearRampToValueAtTime(0, startTime + 0.15);
        sub.connect(subG);
        subG.connect(ctx.destination);
        sub.start(startTime);
        sub.stop(startTime + 0.15);
      };

      // Ring every 3 seconds: 2s ring + 1s silence
      const RING_CYCLE = 3.0;

      // Play first ring immediately
      playRingBurst(ctx.currentTime);

      // Keep scheduling rings every 3 seconds
      alarmIntervalRef.current = setInterval(() => {
        if (ctx.state === 'closed') return;
        playRingBurst(ctx.currentTime);
      }, RING_CYCLE * 1000);

    } catch (err) {
      console.warn('Audio alarm failed:', err);
    }
  }, [alarmMuted]);

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
  };

  const muteAlarm = () => {
    setAlarmMuted(true);
    stopAlarmSound();
    toast.info('Alarm muted');
  };

  // Restart alarm when new alarms arrive and not muted
  useEffect(() => {
    const hasActiveAlarms = Object.keys(alarms).length > 0;
    if (hasActiveAlarms && !alarmMuted) {
      startAlarmSound();
    } else if (!hasActiveAlarms) {
      stopAlarmSound();
    }
    return () => {};
  }, [alarms, alarmMuted]);

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchOrders();
    const socket = connectSocket();

    socket.on('payment:alarm', (data) => {
      setAlarms(prev => ({ ...prev, [data.orderId]: data }));
      setAlarmMuted(false); // new alarm unmutes
      toast.warning(`💰 Payment: ${data.username} paid ₹${data.amountRupees}`);
      fetchOrders();
    });

    socket.on('payment:alarm-dismissed', ({ orderId }) => {
      setAlarms(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    });

    return () => {
      socket.off('payment:alarm');
      socket.off('payment:alarm-dismissed');
      stopAlarmSound();
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payment/admin/all', { params: { status: filter || undefined } });
      setOrders(data.data || []);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const handleAction = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const { order, action } = reviewModal;
      await api.patch(`/payment/admin/${order._id}/${action}`, { adminRemarks: remarks });
      toast.success(action === 'approve' ? `✅ ${order.coinsRequested} coins credited` : 'Payment rejected');
      setReviewModal(null);
      setRemarks('');
      setAlarms(prev => { const n={...prev}; delete n[order._id]; return n; });
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const dismissAlarm = async (orderId) => {
    try {
      await api.patch(`/payment/admin/${orderId}/dismiss-alarm`);
      setAlarms(prev => { const n={...prev}; delete n[orderId]; return n; });
    } catch {}
  };

  const hasAlarms = Object.keys(alarms).length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Persistent Alarm Banner ── */}
      <AnimatePresence>
        {hasAlarms && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl border-2 border-yellow-500/60 bg-yellow-500/10"
            style={{ animation: 'pulse 1s ease-in-out infinite' }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
              >
                <Bell size={24} className="text-yellow-400" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-yellow-300 font-bold">
                  🚨 {Object.keys(alarms).length} Payment{Object.keys(alarms).length > 1 ? 's' : ''} Waiting for Verification
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.values(alarms).map(a => (
                    <span key={a.orderId} className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                      {a.username} — ₹{a.amountRupees}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={muteAlarm}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 transition-all border border-white/10">
                  <BellOff size={13} /> {alarmMuted ? 'Muted' : 'Mute Alarm'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Payments</h1>
          <p className="text-slate-400 mt-1">UPI coin purchase verification</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16}/>} onClick={fetchOrders} size="sm">Refresh</Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['','pending','admin_notified','approved','rejected','expired'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-all
              ${filter===s ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="game-card overflow-hidden">
        {loading ? <TableSkeleton /> : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No payment orders found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['User','Amount','Coins','Platform','Status','Time','Actions'].map(h => (
                  <th key={h} className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map(o => {
                const isAlarmActive = !!alarms[o._id];
                return (
                  <tr key={o._id} className={`hover:bg-white/5 transition-colors ${isAlarmActive ? 'bg-yellow-500/5' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar username={o.user?.username} size="xs" />
                        <div>
                          <p className="text-white text-sm font-medium">{o.user?.username}</p>
                          <p className="text-xs text-slate-500">{o.orderReference}</p>
                        </div>
                        {isAlarmActive && <Bell size={12} className="text-yellow-400 animate-bounce" />}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-white font-semibold text-sm">₹{o.amountRupees}</td>
                    <td className="px-4 py-4 text-yellow-400 font-semibold text-sm">{o.coinsRequested}</td>
                    <td className="px-4 py-4 text-slate-300 text-sm capitalize">{UPI_LABELS[o.upiPlatform] || 'UPI'}</td>
                    <td className="px-4 py-4">
                      <span className={`badge badge-${STATUS_BADGE[o.status]||'gray'} capitalize`}>
                        {o.status?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-xs">
                      {o.createdAt ? formatDistanceToNow(new Date(o.createdAt), {addSuffix:true}) : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setDetailModal(o)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                          <Eye size={14}/>
                        </button>
                        {['pending','admin_notified'].includes(o.status) && (
                          <>
                            <button onClick={() => { setReviewModal({order:o, action:'approve'}); setRemarks(''); }}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all">
                              Approve
                            </button>
                            <button onClick={() => { setReviewModal({order:o, action:'reject'}); setRemarks(''); }}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all">
                              Reject
                            </button>
                          </>
                        )}
                        {isAlarmActive && (
                          <button onClick={() => dismissAlarm(o._id)}
                            className="px-2 py-1 rounded-lg text-xs text-slate-400 border border-white/10 hover:bg-white/10 transition-all">
                            <BellOff size={12}/>
                          </button>
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

      {/* Review Modal */}
      <Modal isOpen={!!reviewModal} onClose={() => setReviewModal(null)}
        title={reviewModal?.action === 'approve' ? '✅ Approve Payment' : '❌ Reject Payment'} size="sm">
        {reviewModal && (
          <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">User</span>
                <span className="text-white font-medium">{reviewModal.order.user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount</span>
                <span className="text-white font-bold">₹{reviewModal.order.amountRupees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coins</span>
                <span className="text-yellow-400 font-bold">{reviewModal.order.coinsRequested}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reference</span>
                <span className="text-white font-mono text-xs">{reviewModal.order.orderReference}</span>
              </div>
            </div>

            {/* Screenshot proof */}
            {reviewModal.order.screenshotUrl ? (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Payment Screenshot</p>
                <img
                  src={reviewModal.order.screenshotUrl}
                  alt="Payment proof"
                  className="w-full rounded-xl border border-white/10 object-contain max-h-56 bg-black/20 cursor-pointer"
                  onClick={() => window.open(reviewModal.order.screenshotUrl, '_blank')}
                />
                <p className="text-xs text-slate-500 text-center">Tap to open full size</p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                ⚠ User has not uploaded a payment screenshot yet.
              </div>
            )}

            {reviewModal.action === 'approve' && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                ✅ Approve only after confirming the payment has arrived in your bank/UPI account.
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Remarks (optional)</label>
              <textarea className="input-field resize-none" rows={2} value={remarks}
                onChange={e => setRemarks(e.target.value)} placeholder="Any note for the user..." />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setReviewModal(null)}>Cancel</Button>
              <Button
                variant={reviewModal.action === 'approve' ? 'success' : 'danger'}
                loading={submitting}
                onClick={handleAction}
              >
                {reviewModal.action === 'approve' ? 'Confirm & Credit Coins' : 'Reject Payment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Payment Details" size="sm">
        {detailModal && (
          <div className="p-6 space-y-3 text-sm overflow-y-auto max-h-[80vh]">
            {[
              ['User', detailModal.user?.username],
              ['Email', detailModal.user?.email],
              ['Amount', `₹${detailModal.amountRupees}`],
              ['Coins', `${detailModal.coinsRequested} coins`],
              ['Reference', detailModal.orderReference],
              ['Platform', UPI_LABELS[detailModal.upiPlatform] || 'UPI'],
              ['Status', detailModal.status],
              ['Created', detailModal.createdAt ? format(new Date(detailModal.createdAt), 'dd MMM yyyy HH:mm') : '—'],
              ['Reviewed By', detailModal.reviewedBy?.username || '—'],
              ['Remarks', detailModal.adminRemarks || '—'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-4">
                <span className="text-slate-400 shrink-0">{l}</span>
                <span className="text-white text-right capitalize">{v}</span>
              </div>
            ))}

            {/* Payment Screenshot */}
            {detailModal.screenshotUrl ? (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Payment Screenshot</p>
                <img
                  src={detailModal.screenshotUrl}
                  alt="Payment proof"
                  className="w-full rounded-xl border border-white/10 object-contain max-h-72 bg-black/20 cursor-pointer"
                  onClick={() => window.open(detailModal.screenshotUrl, '_blank')}
                />
                <p className="text-xs text-slate-500 text-center">Tap to open full size</p>
                {detailModal.screenshotSubmittedAt && (
                  <p className="text-xs text-slate-500 text-center">
                    Submitted: {format(new Date(detailModal.screenshotSubmittedAt), 'dd MMM yyyy HH:mm')}
                  </p>
                )}
              </div>
            ) : (
              <div className="pt-3 border-t border-white/10">
                <p className="text-slate-500 text-xs text-center">No payment screenshot uploaded yet</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
