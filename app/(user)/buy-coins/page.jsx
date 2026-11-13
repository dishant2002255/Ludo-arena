'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, AlertCircle, Info, Shield, Copy, Check, QrCode, Smartphone } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { connectSocket } from '@/lib/socket/socket';
import { useRef } from 'react';
import Link from 'next/link';

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000];

// Step 1: Select amount   Step 2: Pay via QR/UPI   Step 3: Verifying
const STEP = { SELECT: 'select', PAY: 'pay', VERIFYING: 'verifying', DONE: 'done' };

export default function BuyCoinsPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [settings, setSettings]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [coins, setCoins]         = useState(200);
  const [step, setStep]           = useState(STEP.SELECT);
  const [initiating, setInitiating] = useState(false);

  // Payment data after initiation
  const [orderData, setOrderData] = useState(null);
  const [copied, setCopied]       = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [screenshot, setScreenshot] = useState(null);        // File object
  const [screenshotPreview, setScreenshotPreview] = useState(null); // base64 preview
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => { fetchSettings(); }, []);

  // Socket listener for real-time approval
  useEffect(() => {
    if (step !== STEP.VERIFYING || !orderData) return;

    const socket = connectSocket();
    const handleUpdate = async ({ orderId, status, coinsAdded }) => {
      if (orderId !== orderData.orderId) return;
      if (status === 'approved') {
        stopPolling();
        await refreshUser();
        setStep(STEP.DONE);
        setTimeout(() => router.push('/wallet'), 5000);
      }
    };
    socket.on('payment:status-updated', handleUpdate);
    return () => socket.off('payment:status-updated', handleUpdate);
  }, [step, orderData]);

  const startPolling = (orderId) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/payment/order/${orderId}`);
        const st = data.data.order.status;
        setPollCount(c => c + 1);
        if (st === 'approved') {
          stopPolling();
          await refreshUser();
          setStep(STEP.DONE);
          setTimeout(() => router.push('/wallet'), 5000);
        }
      } catch {}
    }, 5000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/payment/settings');
      setSettings(data.data);
      setCoins(data.data.minimumPurchaseCoins || 200);
    } catch {
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    if (coins < (settings?.minimumPurchaseCoins || 200)) {
      toast.error(`Minimum is ₹${settings?.minimumPurchaseCoins || 200}`);
      return;
    }
    setInitiating(true);
    try {
      const { data } = await api.post('/payment/initiate', { coinsRequested: coins, upiPlatform: 'other' });
      const d = data.data;
      setOrderData({
        orderId:       d.order._id,
        orderRef:      d.order.orderReference,
        amountRupees:  d.order.amountRupees,
        upiUrl:        d.upiUrl,
        qrCodeDataUrl: d.qrCodeDataUrl,
        upiId:         d.upiId,
        upiName:       d.upiName,
      });
      setStep(STEP.PAY);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed';
      if (msg.includes('PAYMENT_NOT_ACTIVE') || msg.includes('not currently available')) {
        toast.error('Coin purchases are not active. Use Free Coin Request instead.');
      } else {
        toast.error(msg);
      }
    } finally {
      setInitiating(false);
    }
  };

  const handleIPaid = async () => {
    if (!orderData) return;

    // Screenshot is mandatory
    if (!screenshot) {
      toast.error('Please upload your payment screenshot first');
      return;
    }

    setInitiating(true);
    try {
      // 1. Upload screenshot
      setUploadingScreenshot(true);
      const fd = new FormData();
      fd.append('screenshot', screenshot);
      await api.post(`/payment/screenshot/${orderData.orderId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadingScreenshot(false);

      // 2. Notify admin (fires alarm)
      await api.post(`/payment/notify/${orderData.orderId}`);

      setStep(STEP.VERIFYING);
      startPolling(orderData.orderId);
    } catch (err) {
      setUploadingScreenshot(false);
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setInitiating(false);
    }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG or WebP allowed');
      return;
    }
    // Validate size (8MB)
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Screenshot must be under 8 MB');
      return;
    }
    setScreenshot(file);
    // Generate preview
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success('Copied!');
      setTimeout(() => setCopied(''), 2000);
    });
  };

  if (loading) return (
    <div className="max-w-md mx-auto space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );

  const amountRupees     = coins * (settings?.coinPriceRupees || 1);
  const isPaymentActive  = settings?.upiEnabled && settings?.upiConfigured;

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in py-4">

      <AnimatePresence mode="wait">

        {/* ══ STEP 1 — SELECT AMOUNT ══════════════════════════════════════ */}
        {step === STEP.SELECT && (
          <motion.div key="select" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-white font-display">Buy Coins</h1>
              <p className="text-slate-400 mt-1">1 coin = ₹{settings?.coinPriceRupees || 1} · Pay via UPI QR code</p>
            </div>

            {/* Not active */}
            {!isPaymentActive && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-300 font-semibold text-sm">Coin Purchases Not Active</p>
                  <p className="text-amber-400/70 text-xs mt-1">Admin hasn't set up UPI yet.</p>
                  <Link href="/wallet" className="text-xs text-amber-400 underline mt-1 inline-block">Request free coins →</Link>
                </div>
              </div>
            )}

            {/* Balance */}
            <div className="game-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-yellow-400" />
                <span className="text-slate-400 text-sm">Your balance</span>
              </div>
              <span className="text-yellow-400 font-bold">{user?.walletBalance?.toLocaleString() || 0} coins</span>
            </div>

            {/* Quick amounts */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Select amount</p>
              <div className="grid grid-cols-5 gap-2">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setCoins(a)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all
                      ${coins === a ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom */}
            <Input label="Custom amount" type="number" value={coins}
              min={settings?.minimumPurchaseCoins || 200}
              max={settings?.maximumPurchaseCoins || 10000}
              onChange={e => setCoins(Math.max(0, parseInt(e.target.value) || 0))}
              hint={`Min: ${settings?.minimumPurchaseCoins || 200} · Max: ${settings?.maximumPurchaseCoins || 10000}`} />

            {/* Summary */}
            <div className="game-card p-5 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">You get</span>
                <span className="text-2xl font-black text-white">{coins.toLocaleString()} <span className="text-yellow-400 text-lg">coins</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">You pay</span>
                <span className="text-2xl font-black text-white">₹{amountRupees.toLocaleString()}</span>
              </div>
            </div>

            {/* How it works */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1.5">
              <p className="font-semibold text-blue-200">How it works:</p>
              <p>1. Click Proceed — you'll see a QR code and UPI ID</p>
              <p>2. Open any UPI app (GPay, PhonePe, Paytm, etc.) and scan the QR code</p>
              <p>3. Or manually enter the UPI ID and amount in your app</p>
              <p>4. After paying, click <strong>"I Have Paid"</strong></p>
              <p>5. Admin verifies and coins are added instantly</p>
            </div>

            <Button fullWidth loading={initiating}
              disabled={!isPaymentActive || coins < (settings?.minimumPurchaseCoins || 200)}
              onClick={handleProceed} className="text-lg py-4">
              <Shield size={18} />
              {isPaymentActive ? `Proceed to Pay ₹${amountRupees}` : 'Payment Not Available'}
            </Button>
          </motion.div>
        )}

        {/* ══ STEP 2 — PAY via QR + UPI ID ════════════════════════════════ */}
        {step === STEP.PAY && orderData && (
          <motion.div key="pay" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white font-display">Complete Payment</h2>
              <p className="text-slate-400 text-sm mt-1">Scan QR code or use UPI ID</p>
            </div>

            {/* Amount card */}
            <div className="game-card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pay exactly</p>
                <p className="text-2xl font-black text-white">₹{orderData.amountRupees}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">You get</p>
                <p className="text-xl font-bold text-yellow-400">{coins} coins</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="game-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode size={18} className="text-purple-400" />
                <p className="text-white font-semibold text-sm">Scan with any UPI app</p>
              </div>

              {orderData.qrCodeDataUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white rounded-2xl inline-block">
                    <img
                      src={orderData.qrCodeDataUrl}
                      alt="UPI QR Code"
                      className="w-52 h-52 block"
                    />
                  </div>
                  <p className="text-xs text-slate-400 text-center">
                    Open GPay / PhonePe / Paytm → Scan QR code
                  </p>
                </div>
              ) : (
                <div className="w-52 h-52 mx-auto rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <p className="text-slate-500 text-xs text-center px-4">QR unavailable — use UPI ID below</p>
                </div>
              )}
            </div>

            {/* OR divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-slate-500 text-xs font-medium">OR ENTER MANUALLY</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* UPI ID copy */}
            <div className="game-card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone size={16} className="text-purple-400" />
                <p className="text-white font-semibold text-sm">Pay manually in your UPI app</p>
              </div>

              {/* UPI ID */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">UPI ID (Payee)</p>
                  <p className="text-white font-mono font-semibold">{orderData.upiId}</p>
                  {orderData.upiName && <p className="text-xs text-slate-400">{orderData.upiName}</p>}
                </div>
                <button onClick={() => copy(orderData.upiId, 'upiid')}
                  className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 transition-all shrink-0">
                  {copied === 'upiid' ? <Check size={16} className="text-emerald-400"/> : <Copy size={16}/>}
                </button>
              </div>

              {/* Amount */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Amount</p>
                  <p className="text-white font-semibold">₹{orderData.amountRupees}</p>
                </div>
                <button onClick={() => copy(String(orderData.amountRupees), 'amt')}
                  className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 transition-all shrink-0">
                  {copied === 'amt' ? <Check size={16} className="text-emerald-400"/> : <Copy size={16}/>}
                </button>
              </div>

              {/* Note */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Add this in Remarks/Note</p>
                  <p className="text-white font-mono text-sm">{orderData.orderRef}</p>
                </div>
                <button onClick={() => copy(orderData.orderRef, 'ref')}
                  className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 transition-all shrink-0">
                  {copied === 'ref' ? <Check size={16} className="text-emerald-400"/> : <Copy size={16}/>}
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 space-y-0.5">
              <p className="font-semibold">⚠ Before clicking "I Have Paid":</p>
              <p>• Make sure the payment is completed in your UPI app</p>
              <p>• The reference number must match: <span className="font-mono font-bold">{orderData.orderRef}</span></p>
              <p>• Coins are credited only after admin verifies the payment</p>
            </div>

            {/* Screenshot upload — mandatory */}
            <div className="game-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-xs text-purple-300 font-bold">4</div>
                <p className="text-white font-semibold text-sm">Upload Payment Screenshot <span className="text-red-400">*</span></p>
              </div>
              <p className="text-slate-400 text-xs">Take a screenshot from your UPI app showing the payment confirmation and upload it here. Admin will verify it.</p>

              {/* Preview */}
              {screenshotPreview ? (
                <div className="relative">
                  <img src={screenshotPreview} alt="Payment screenshot" className="w-full max-h-48 object-contain rounded-xl border border-white/10 bg-black/20" />
                  <button
                    onClick={() => { setScreenshot(null); setScreenshotPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center text-white text-xs hover:bg-red-500 transition-all"
                  >✕</button>
                  <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                    <Check size={12} /> {screenshot?.name}
                  </p>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-500/30 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/60 hover:bg-purple-500/5 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                    <QrCode size={20} className="text-purple-400" />
                  </div>
                  <p className="text-slate-300 text-sm font-medium">Tap to upload screenshot</p>
                  <p className="text-slate-500 text-xs mt-1">JPG, PNG, WebP — max 8 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleScreenshotChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setStep(STEP.SELECT)}>Go Back</Button>
              <Button
                loading={initiating}
                disabled={!screenshot}
                onClick={handleIPaid}
                variant="success"
              >
                <Check size={16} /> I Have Paid
              </Button>
            </div>
          </motion.div>
        )}

        {/* ══ STEP 3 — VERIFYING ══════════════════════════════════════════ */}
        {step === STEP.VERIFYING && (
          <motion.div key="verifying" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <div className="game-card p-10 text-center space-y-6">
              {/* Spinner */}
              <div className="relative w-20 h-20 mx-auto">
                <motion.div className="absolute inset-0 rounded-full border-4 border-purple-500/20"
                  animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                <motion.div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-transparent"
                  animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield size={26} className="text-purple-400" />
                </div>
              </div>

              <div>
                <p className="text-white font-bold text-xl">Admin is Verifying Your Payment</p>
                <p className="text-slate-400 text-sm mt-2">Please keep this page open. This usually takes a few minutes.</p>
              </div>

              <div className="flex justify-center gap-2">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-2.5 h-2.5 rounded-full bg-purple-500"
                    animate={{ opacity: [0.2,1,0.2] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.45 }} />
                ))}
              </div>

              <p className="text-xs text-slate-600">Checking every 5 seconds · {pollCount} check{pollCount !== 1 ? 's' : ''}</p>
            </div>
          </motion.div>
        )}

        {/* ══ STEP 4 — DONE ═══════════════════════════════════════════════ */}
        {step === STEP.DONE && (
          <motion.div key="done" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
            transition={{type:'spring',stiffness:200,damping:18}}>
            <div className="game-card p-10 text-center space-y-5">
              <motion.div initial={{scale:0}} animate={{scale:1}}
                transition={{type:'spring',stiffness:250,damping:15,delay:0.1}}
                className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
                <Check size={42} className="text-emerald-400" />
              </motion.div>
              <div>
                <p className="text-white font-black text-2xl">Coins Transferred! 🎉</p>
                <p className="text-emerald-400 text-xl font-bold">+{coins.toLocaleString()} coins added</p>
              </div>
              <p className="text-slate-400 text-sm">Redirecting to wallet in 5 seconds…</p>
              <motion.div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-emerald-500 rounded-full"
                  initial={{ width: '100%' }} animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }} />
              </motion.div>
              <Button fullWidth variant="success" onClick={() => router.push('/wallet')}>Go to Wallet Now</Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
