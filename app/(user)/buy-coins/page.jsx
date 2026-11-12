'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Coins, AlertCircle, Info, ChevronRight, Shield, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import Link from 'next/link';

const UPI_APPS = [
  { id: 'gpay',    label: 'Google Pay',  color: 'from-blue-600 to-green-500',  emoji: '🟢' },
  { id: 'phonepe', label: 'PhonePe',     color: 'from-purple-600 to-indigo-500', emoji: '🟣' },
  { id: 'paytm',   label: 'Paytm',       color: 'from-blue-500 to-sky-400',    emoji: '🔵' },
  { id: 'bhim',    label: 'BHIM UPI',    color: 'from-orange-500 to-amber-400', emoji: '🟠' },
  { id: 'other',   label: 'Other UPI',   color: 'from-slate-600 to-slate-500',  emoji: '💳' },
];

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000];

export default function BuyCoinsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState(200);
  const [selectedApp, setSelectedApp] = useState('gpay');
  const [initiating, setInitiating] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

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
      toast.error(`Minimum purchase is ${settings?.minimumPurchaseCoins || 200} coins`);
      return;
    }
    setInitiating(true);
    try {
      const { data } = await api.post('/payment/initiate', { coinsRequested: coins, upiPlatform: selectedApp });
      // Redirect to checkout page with order info
      const orderId = data.data.order._id;
      const upiUrl = encodeURIComponent(data.data.appLinks[selectedApp] || data.data.upiUrl);
      router.push(`/buy-coins/checkout?orderId=${orderId}&app=${selectedApp}&upiUrl=${upiUrl}&coins=${coins}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed';
      if (msg.includes('not currently available') || msg.includes('PAYMENT_NOT_ACTIVE')) {
        toast.error('Coin purchases are not active. Please use the Free Coin Request feature instead.');
      } else {
        toast.error(msg);
      }
    } finally {
      setInitiating(false);
    }
  };

  if (loading) return (
    <div className="max-w-lg mx-auto space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );

  const amountRupees = coins * (settings?.coinPriceRupees || 1);
  const isPaymentActive = settings?.upiEnabled && settings?.upiConfigured;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Buy Coins</h1>
        <p className="text-slate-400 mt-1">
          {settings?.coinPriceRupees === 1 ? '1 coin = ₹1' : `1 coin = ₹${settings?.coinPriceRupees}`} · Instant via UPI
        </p>
      </div>

      {/* Not active banner */}
      {!isPaymentActive && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">Coin Purchases Coming Soon</p>
            <p className="text-amber-400/70 text-xs mt-1">
              UPI payments are not yet active. You can request free demo coins from your wallet page.
            </p>
            <Link href="/wallet" className="text-xs text-amber-400 underline mt-2 inline-block">
              Request free coins instead →
            </Link>
          </div>
        </div>
      )}

      {/* Current balance */}
      <div className="game-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins size={18} className="text-yellow-400" />
          <span className="text-slate-400 text-sm">Your balance</span>
        </div>
        <span className="text-yellow-400 font-bold">{user?.walletBalance?.toLocaleString() || 0} coins</span>
      </div>

      {/* Quick amounts */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">Select amount</p>
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

      {/* Custom amount */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">Or enter custom amount</p>
        <Input
          type="number"
          value={coins}
          min={settings?.minimumPurchaseCoins || 200}
          max={settings?.maximumPurchaseCoins || 10000}
          onChange={e => setCoins(Math.max(0, parseInt(e.target.value) || 0))}
          hint={`Min: ${settings?.minimumPurchaseCoins || 200} coins · Max: ${settings?.maximumPurchaseCoins || 10000} coins`}
        />
      </div>

      {/* Price display */}
      <div className="game-card p-5 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-400">You get</span>
          <span className="text-2xl font-black text-white">{coins.toLocaleString()} <span className="text-yellow-400 text-lg">coins</span></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">You pay</span>
          <span className="text-2xl font-black text-white">₹{amountRupees.toLocaleString()}</span>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-500">
          Instant credit after admin verification · No hidden charges
        </div>
      </div>

      {/* UPI App selection */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">Pay via</p>
        <div className="space-y-2">
          {UPI_APPS.map(app => (
            <button key={app.id} onClick={() => setSelectedApp(app.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all
                ${selectedApp === app.id ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <span className="text-2xl">{app.emoji}</span>
              <span className="text-white font-medium text-sm flex-1 text-left">{app.label}</span>
              {selectedApp === app.id && <ChevronRight size={16} className="text-purple-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <Info size={13} className="shrink-0 mt-0.5" />
        <p>Coins are virtual credits for free-to-play gaming only. No monetary value. Non-refundable after credit. By purchasing, you agree to our terms.</p>
      </div>

      {/* Proceed button */}
      <Button
        fullWidth
        loading={initiating}
        disabled={!isPaymentActive || coins < (settings?.minimumPurchaseCoins || 200)}
        onClick={handleProceed}
        className="text-lg py-4"
      >
        <Shield size={18} />
        {isPaymentActive ? `Pay ₹${amountRupees} via ${UPI_APPS.find(a=>a.id===selectedApp)?.label}` : 'Payment Not Available'}
      </Button>
    </div>
  );
}
