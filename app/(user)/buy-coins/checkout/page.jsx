'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, CheckCircle, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/api/axios';
import { connectSocket } from '@/lib/socket/socket';
import useAuthStore from '@/store/authStore';

const STAGE = {
  VERIFYING: 'verifying',  // Admin is verifying — default stage on this page
  APPROVED:  'approved',
};

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { refreshUser } = useAuthStore();

  const orderId  = searchParams.get('orderId');
  const ref      = searchParams.get('ref') || '';
  const coins    = parseInt(searchParams.get('coins') || '0');
  const app      = searchParams.get('app') || 'upi';

  const [stage, setStage]         = useState(STAGE.VERIFYING);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!orderId) { router.push('/buy-coins'); return; }

    // Real-time: listen for admin approval
    const socket = connectSocket();

    const handleStatusUpdate = async ({ orderId: oid, status, coinsAdded }) => {
      if (oid !== orderId) return;
      if (status === 'approved') {
        stopPolling();
        await refreshUser();
        setStage(STAGE.APPROVED);
        // Redirect to wallet after 5 seconds
        setTimeout(() => router.push('/wallet'), 5000);
      }
    };

    socket.on('payment:status-updated', handleStatusUpdate);

    // Fallback polling every 5 seconds
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/payment/order/${orderId}`);
        const st = data.data.order.status;
        setPollCount(c => c + 1);
        if (st === 'approved') {
          stopPolling();
          await refreshUser();
          setStage(STAGE.APPROVED);
          setTimeout(() => router.push('/wallet'), 5000);
        }
      } catch {}
    }, 5000);

    return () => {
      socket.off('payment:status-updated', handleStatusUpdate);
      stopPolling();
    };
  }, [orderId]);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  return (
    <div className="max-w-sm mx-auto min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full space-y-5">

        {/* Order summary */}
        <div className="game-card p-6 text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
            <Coins size={30} className="text-yellow-400" />
          </div>
          <p className="text-3xl font-black text-white">
            {coins.toLocaleString()} <span className="text-yellow-400 text-2xl">coins</span>
          </p>
          <p className="text-slate-400 text-sm">₹{coins} payment</p>
          {ref && (
            <p className="text-xs text-slate-600 font-mono">Ref: {ref}</p>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* ── VERIFYING ── */}
          {stage === STAGE.VERIFYING && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="game-card p-8 text-center space-y-6"
            >
              {/* Spinning shield animation */}
              <div className="relative w-20 h-20 mx-auto">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-purple-500/20"
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield size={26} className="text-purple-400" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-white font-bold text-xl">Admin is Verifying Your Payment</p>
                <p className="text-slate-400 text-sm">
                  Please wait while admin checks the payment in their bank account.
                </p>
                <p className="text-slate-500 text-xs">
                  This page will update automatically. Do not close it.
                </p>
              </div>

              {/* Pulsing dots */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-purple-500"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.45 }}
                  />
                ))}
              </div>

              <p className="text-xs text-slate-600">
                Checking every 5 seconds · {pollCount} check{pollCount !== 1 ? 's' : ''}
              </p>
            </motion.div>
          )}

          {/* ── APPROVED ── */}
          {stage === STAGE.APPROVED && (
            <motion.div
              key="approved"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="game-card p-8 text-center space-y-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 15, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto"
              >
                <CheckCircle size={42} className="text-emerald-400" />
              </motion.div>

              <div className="space-y-1">
                <p className="text-white font-black text-2xl">Coins Transferred! 🎉</p>
                <p className="text-emerald-400 text-xl font-bold">+{coins.toLocaleString()} coins added</p>
              </div>

              <p className="text-slate-400 text-sm">
                Redirecting to your wallet in 5 seconds…
              </p>

              {/* Countdown bar */}
              <motion.div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </motion.div>

              <Button fullWidth variant="success" onClick={() => router.push('/wallet')}>
                Go to Wallet Now
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
