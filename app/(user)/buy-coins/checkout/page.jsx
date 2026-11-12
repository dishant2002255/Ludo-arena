'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, CheckCircle, XCircle, Clock, ExternalLink, Shield, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api/axios';
import { connectSocket } from '@/lib/socket/socket';
import { toast } from '@/store/toastStore';
import useAuthStore from '@/store/authStore';

const UPI_APP_LABELS = {
  gpay: 'Google Pay', phonepe: 'PhonePe', paytm: 'Paytm', bhim: 'BHIM UPI', other: 'UPI',
};

const STAGE = {
  READY:       'ready',         // Show payment button
  OPENED:      'opened',        // User clicked UPI button — show verifying
  VERIFYING:   'verifying',     // Admin notified — waiting for admin
  APPROVED:    'approved',
  REJECTED:    'rejected',
  EXPIRED:     'expired',
};

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuthStore();

  const orderId  = searchParams.get('orderId');
  const app      = searchParams.get('app') || 'other';
  const upiUrl   = decodeURIComponent(searchParams.get('upiUrl') || '');
  const coins    = parseInt(searchParams.get('coins') || '0');

  const [stage, setStage]       = useState(STAGE.READY);
  const [order, setOrder]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!orderId) { router.push('/buy-coins'); return; }

    // Connect socket to listen for real-time approval
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

  // ── Polling fallback (in case socket disconnects) ──────────────────────────
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
    }, 5000); // poll every 5 seconds
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // ── Handle UPI button click ────────────────────────────────────────────────
  const handleOpenUPI = async () => {
    setStage(STAGE.OPENED);
    // Open UPI app
    if (upiUrl) window.location.href = upiUrl;

    // After 3 seconds, notify admin and start verifying stage
    setTimeout(async () => {
      setLoading(true);
      try {
        await api.post(`/payment/notify/${orderId}`);
        setStage(STAGE.VERIFYING);
        startPolling();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to notify admin');
        setStage(STAGE.READY);
      } finally {
        setLoading(false);
      }
    }, 3000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto min-h-[70vh] flex items-center justify-center">
      <div className="w-full space-y-6 animate-fade-in">
        {/* Order summary */}
        <div className="game-card p-6 text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-3">
            <Coins size={32} className="text-yellow-400" />
          </div>
          <p className="text-3xl font-black text-white">{coins.toLocaleString()} <span className="text-yellow-400 text-2xl">coins</span></p>
          <p className="text-slate-400 text-sm">₹{coins} via {UPI_APP_LABELS[app]}</p>
          {orderId && <p className="text-xs text-slate-600 font-mono">Ref: {orderId.slice(-8).toUpperCase()}</p>}
        </div>

        {/* Stage-based content */}
        <AnimatePresence mode="wait">

          {/* READY — show pay button */}
          {stage === STAGE.READY && (
            <motion.div key="ready" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                <p className="font-semibold">How it works:</p>
                <p>1. Click the button below to open {UPI_APP_LABELS[app]}</p>
                <p>2. Complete the payment of ₹{coins}</p>
                <p>3. Come back here — we'll verify and add coins</p>
              </div>
              <Button fullWidth className="text-lg py-4" onClick={handleOpenUPI}>
                <ExternalLink size={18} />
                Open {UPI_APP_LABELS[app]} & Pay ₹{coins}
              </Button>
              <Button fullWidth variant="secondary" onClick={() => router.push('/buy-coins')}>
                Cancel
              </Button>
            </motion.div>
          )}

          {/* OPENED — user clicked, waiting to notify */}
          {stage === STAGE.OPENED && (
            <motion.div key="opened" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="text-center space-y-4">
              <motion.div animate={{rotate:360}} transition={{duration:2, repeat:Infinity, ease:'linear'}} className="w-16 h-16 rounded-full border-4 border-purple-500 border-t-transparent mx-auto" />
              <div>
                <p className="text-white font-semibold text-lg">Opening {UPI_APP_LABELS[app]}…</p>
                <p className="text-slate-400 text-sm mt-1">Please complete the payment in the app</p>
              </div>
            </motion.div>
          )}

          {/* VERIFYING — persistent "We are verifying" screen */}
          {stage === STAGE.VERIFYING && (
            <motion.div key="verifying" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="text-center space-y-5">
              <div className="relative">
                <motion.div
                  className="w-20 h-20 rounded-full border-4 border-purple-500/30 mx-auto"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-purple-500 border-transparent mx-auto"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <Shield size={28} className="text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>

              <div>
                <p className="text-white font-bold text-xl">We are Verifying Your Payment</p>
                <p className="text-slate-400 text-sm mt-2">
                  Admin has been notified. This usually takes a few minutes.
                </p>
                <p className="text-slate-500 text-xs mt-3">
                  Please keep this page open. You'll be redirected automatically.
                </p>
              </div>

              {/* Pulsing dots */}
              <div className="flex justify-center gap-2">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-purple-400"
                    animate={{ opacity: [0.3,1,0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} />
                ))}
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400 text-left space-y-1">
                <p>✓ Payment notification sent to admin</p>
                <p>⏳ Admin is verifying your bank receipt</p>
                <p className="text-slate-500">Checking every 5 seconds ({pollCount} checks)</p>
              </div>

              <Button variant="secondary" size="sm" onClick={async () => {
                try {
                  const { data } = await api.get(`/payment/order/${orderId}`);
                  const st = data.data.order.status;
                  if (st === 'approved') setStage(STAGE.APPROVED);
                  else if (st === 'rejected') setStage(STAGE.REJECTED);
                  else toast.info('Still verifying. Please wait.');
                } catch {}
              }} icon={<RefreshCw size={14}/>}>
                Check Status
              </Button>
            </motion.div>
          )}

          {/* APPROVED */}
          {stage === STAGE.APPROVED && (
            <motion.div key="approved" initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto"
              >
                <CheckCircle size={40} className="text-emerald-400" />
              </motion.div>
              <div>
                <p className="text-white font-bold text-2xl">Payment Verified! 🎉</p>
                <p className="text-emerald-400 text-lg font-semibold mt-1">+{coins} coins added!</p>
                <p className="text-slate-400 text-sm mt-2">Redirecting to your wallet...</p>
              </div>
              <Button fullWidth variant="success" onClick={() => router.push('/wallet')}>
                Go to Wallet
              </Button>
            </motion.div>
          )}

          {/* REJECTED */}
          {stage === STAGE.REJECTED && (
            <motion.div key="rejected" initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <XCircle size={40} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-bold text-xl">Payment Not Verified</p>
                <p className="text-slate-400 text-sm mt-2">Admin could not verify your payment. Please contact support with your reference number.</p>
                <p className="text-xs text-slate-600 font-mono mt-2">Ref: {orderId?.slice(-8).toUpperCase()}</p>
              </div>
              <Button fullWidth variant="secondary" onClick={() => router.push('/wallet')}>Back to Wallet</Button>
            </motion.div>
          )}

          {/* EXPIRED */}
          {stage === STAGE.EXPIRED && (
            <motion.div key="expired" initial={{opacity:0}} animate={{opacity:1}} className="text-center space-y-4">
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
    </div>
  );
}
