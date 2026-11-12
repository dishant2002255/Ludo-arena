'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, CheckCircle, XCircle, Clock, ExternalLink, Shield, RefreshCw, Copy, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api/axios';
import { connectSocket } from '@/lib/socket/socket';
import { toast } from '@/store/toastStore';
import useAuthStore from '@/store/authStore';

const UPI_APP_LABELS = {
  gpay: 'Google Pay', phonepe: 'PhonePe', paytm: 'Paytm', bhim: 'BHIM UPI', other: 'UPI',
};

const STAGE = {
  READY:     'ready',      // Show payment instructions
  VERIFYING: 'verifying',  // User clicked "I've Paid" — waiting for admin
  APPROVED:  'approved',
  REJECTED:  'rejected',
  EXPIRED:   'expired',
};

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { refreshUser } = useAuthStore();

  const orderId    = searchParams.get('orderId');
  const app        = searchParams.get('app') || 'other';
  const upiUrl     = decodeURIComponent(searchParams.get('upiUrl') || '');
  const coins      = parseInt(searchParams.get('coins') || '0');
  const upiId      = searchParams.get('upiId') || '';
  const upiName    = searchParams.get('upiName') || 'Ludo Arena';
  const orderRef   = searchParams.get('ref') || '';

  const [stage, setStage]         = useState(STAGE.READY);
  const [loading, setLoading]     = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [copied, setCopied]       = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    if (!orderId) { router.push('/buy-coins'); return; }

    // Real-time socket listener for admin approval
    const socket = connectSocket();
    socket.on('payment:status-updated', async ({ orderId: oid, status, coinsAdded, redirectTo }) => {
      if (oid !== orderId) return;
      if (status === 'approved') {
        setStage(STAGE.APPROVED);
        stopPolling();
        await refreshUser();
        toast.success(`✅ ${coinsAdded} coins added to your wallet!`);
        setTimeout(() => router.push(redirectTo || '/wallet'), 3000);
      } else if (status === 'rejected') {
        setStage(STAGE.REJECTED);
        stopPolling();
      }
    });

    return () => {
      socket.off('payment:status-updated');
      stopPolling();
    };
  }, [orderId]);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/payment/order/${orderId}`);
        const st = data.data.order.status;
        setPollCount(c => c + 1);
        if (st === 'approved') {
          setStage(STAGE.APPROVED);
          stopPolling();
          await refreshUser();
          setTimeout(() => router.push('/wallet'), 3000);
        } else if (st === 'rejected') {
          setStage(STAGE.REJECTED);
          stopPolling();
        } else if (st === 'expired') {
          setStage(STAGE.EXPIRED);
          stopPolling();
        }
      } catch {}
    }, 5000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // ── User clicks "I have paid" ──────────────────────────────────────────────
  const handleIPaid = async () => {
    setLoading(true);
    try {
      await api.post(`/payment/notify/${orderId}`);
      setStage(STAGE.VERIFYING);
      startPolling();
      toast.info('Admin notified! Waiting for verification...');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to notify admin');
    } finally {
      setLoading(false);
    }
  };

  // ── Open UPI app without navigating away ──────────────────────────────────
  const handleOpenApp = () => {
    if (!upiUrl) return;
    // Use a hidden link with target=_blank to open UPI without leaving the page
    const link = document.createElement('a');
    link.href = upiUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div className="max-w-md mx-auto py-6 space-y-4 animate-fade-in">
      {/* Order summary card */}
      <div className="game-card p-5 text-center">
        <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-3">
          <Coins size={28} className="text-yellow-400" />
        </div>
        <p className="text-2xl font-black text-white">{coins.toLocaleString()} <span className="text-yellow-400 text-xl">coins</span></p>
        <p className="text-slate-400 text-sm mt-1">Amount: <span className="text-white font-semibold">₹{coins}</span></p>
        {orderRef && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <code className="text-xs text-slate-500 font-mono bg-white/5 px-2 py-1 rounded">{orderRef}</code>
            <button onClick={() => copyToClipboard(orderRef, 'ref')} className="text-slate-500 hover:text-white">
              {copied === 'ref' ? <Check size={12} className="text-emerald-400"/> : <Copy size={12}/>}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* ── READY: Show UPI payment instructions ── */}
        {stage === STAGE.READY && (
          <motion.div key="ready" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">

            {/* Step-by-step instructions */}
            <div className="game-card p-5 space-y-4">
              <p className="text-white font-semibold text-sm">Follow these steps:</p>

              {/* Step 1: Open UPI app */}
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-xs text-purple-300 font-bold">1</div>
                <div className="flex-1">
                  <p className="text-slate-300 text-sm font-medium">Open your UPI app</p>
                  <p className="text-slate-500 text-xs mt-0.5">Tap the button to open {UPI_APP_LABELS[app]}, or use any UPI app manually</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    icon={<ExternalLink size={14}/>}
                    onClick={handleOpenApp}
                  >
                    Open {UPI_APP_LABELS[app]}
                  </Button>
                </div>
              </div>

              {/* Step 2: Pay to this UPI ID */}
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-xs text-purple-300 font-bold">2</div>
                <div className="flex-1">
                  <p className="text-slate-300 text-sm font-medium">Send ₹{coins} to this UPI ID</p>
                  <div className="mt-1.5 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500">Pay to</p>
                      <p className="text-white font-mono font-semibold text-sm">{upiId || 'Check admin settings'}</p>
                      {upiName && <p className="text-xs text-slate-400">{upiName}</p>}
                    </div>
                    {upiId && (
                      <button onClick={() => copyToClipboard(upiId, 'upi')}
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all shrink-0">
                        {copied === 'upi' ? <Check size={16} className="text-emerald-400"/> : <Copy size={16}/>}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 p-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500">Amount</p>
                      <p className="text-white font-semibold">₹{coins}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Note / Ref</p>
                      <p className="text-white text-xs font-mono">{orderRef || orderId?.slice(-8)}</p>
                    </div>
                    <button onClick={() => copyToClipboard(String(coins), 'amount')}
                      className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all">
                      {copied === 'amount' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Come back and confirm */}
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-xs text-purple-300 font-bold">3</div>
                <div className="flex-1">
                  <p className="text-slate-300 text-sm font-medium">Come back here after paying</p>
                  <p className="text-slate-500 text-xs mt-0.5">Don't close this page. After completing payment in your UPI app, tap the button below.</p>
                </div>
              </div>
            </div>

            {/* Important warning */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 space-y-1">
              <p className="font-semibold">⚠ Important</p>
              <p>• Keep this page open — do NOT close it</p>
              <p>• Add the reference number in payment remarks: <span className="font-mono font-bold">{orderRef}</span></p>
              <p>• Coins will be credited after admin verifies receipt</p>
            </div>

            {/* Action buttons */}
            <Button fullWidth loading={loading} onClick={handleIPaid} className="py-4 text-base">
              <CheckCircle size={18} />
              I Have Completed the Payment
            </Button>
            <Button fullWidth variant="secondary" onClick={() => router.push('/buy-coins')}>
              Cancel Order
            </Button>
          </motion.div>
        )}

        {/* ── VERIFYING ── */}
        {stage === STAGE.VERIFYING && (
          <motion.div key="verifying" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <div className="game-card p-8 text-center space-y-5">
              <div className="relative w-20 h-20 mx-auto">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-purple-500/20"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <Shield size={28} className="text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>

              <div>
                <p className="text-white font-bold text-xl">Verifying Your Payment</p>
                <p className="text-slate-400 text-sm mt-2">Admin has been notified and will verify shortly.</p>
                <p className="text-slate-500 text-xs mt-1">This page will update automatically.</p>
              </div>

              <div className="flex justify-center gap-2">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-purple-400"
                    animate={{ opacity: [0.3,1,0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} />
                ))}
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400 text-left space-y-1">
                <p>✅ Payment reported to admin</p>
                <p>⏳ Waiting for bank verification ({pollCount} checks)</p>
                <p className="font-mono text-slate-600">Ref: {orderRef}</p>
              </div>

              <Button variant="secondary" size="sm" icon={<RefreshCw size={14}/>} onClick={async () => {
                try {
                  const { data } = await api.get(`/payment/order/${orderId}`);
                  const st = data.data.order.status;
                  if (st === 'approved') setStage(STAGE.APPROVED);
                  else if (st === 'rejected') setStage(STAGE.REJECTED);
                  else toast.info('Still verifying. Please wait.');
                } catch {}
              }}>
                Check Status
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── APPROVED ── */}
        {stage === STAGE.APPROVED && (
          <motion.div key="approved" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="game-card p-8 text-center space-y-4">
            <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:200,damping:15}}
              className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle size={40} className="text-emerald-400" />
            </motion.div>
            <div>
              <p className="text-white font-bold text-2xl">Payment Verified! 🎉</p>
              <p className="text-emerald-400 text-lg font-semibold mt-1">+{coins} coins added!</p>
              <p className="text-slate-400 text-sm mt-2">Redirecting to your wallet...</p>
            </div>
            <Button fullWidth variant="success" onClick={() => router.push('/wallet')}>Go to Wallet</Button>
          </motion.div>
        )}

        {/* ── REJECTED ── */}
        {stage === STAGE.REJECTED && (
          <motion.div key="rejected" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="game-card p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <XCircle size={40} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-bold text-xl">Payment Not Verified</p>
              <p className="text-slate-400 text-sm mt-2">Admin could not verify this payment. Contact support with your reference number.</p>
              <p className="text-xs text-slate-600 font-mono mt-2">Ref: {orderRef}</p>
            </div>
            <Button fullWidth variant="secondary" onClick={() => router.push('/wallet')}>Back to Wallet</Button>
          </motion.div>
        )}

        {/* ── EXPIRED ── */}
        {stage === STAGE.EXPIRED && (
          <motion.div key="expired" initial={{opacity:0}} animate={{opacity:1}} className="game-card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto">
              <Clock size={32} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Order Expired</p>
              <p className="text-slate-400 text-sm mt-1">This order has expired. Please create a new purchase.</p>
            </div>
            <Button fullWidth onClick={() => router.push('/buy-coins')}>Try Again</Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
