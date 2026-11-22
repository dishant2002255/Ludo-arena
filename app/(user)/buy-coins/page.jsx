'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, QrCode, Camera } from 'lucide-react';
import Input from '@/components/ui/Input';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { connectSocket } from '@/lib/socket/socket';
import Link from 'next/link';

const QUICK = [200, 500, 1000, 2000, 5000];
const STEP  = { SELECT: 'select', PAY: 'pay', VERIFYING: 'verifying', DONE: 'done' };

const G = {
  goldBtn: { background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800', boxShadow: '0 3px 10px rgba(201,150,10,0.3)' },
  card:    { background: '#fffdf5', border: '1.5px solid #e8d49a' },
  muted:   '#a09070',
  sub:     '#7a5a00',
  text:    '#3b2800',
  gold:    '#c9960a',
  green:   '#0a7a3c',
  border:  '#e8d49a',
};

export default function BuyCoinsPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [settings, setSettings]     = useState(null);
  const [subAdmins, setSubAdmins]   = useState([]);
  const [subAdminId, setSubAdminId] = useState('');
  const [loading, setLoading]       = useState(true);
  const [coins, setCoins]           = useState(200);
  const [step, setStep]             = useState(STEP.SELECT);
  const [initiating, setInitiating] = useState(false);
  const [orderData, setOrderData]   = useState(null);
  const [copied, setCopied]         = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [pollCount, setPollCount]   = useState(0);
  const fileInputRef = useRef(null);
  const pollRef      = useRef(null);

  useEffect(() => { fetchSettings(); }, []);

  useEffect(() => {
    if (step !== STEP.VERIFYING || !orderData) return;
    const socket = connectSocket();
    const handleUpdate = async ({ orderId, status }) => {
      if (orderId !== orderData.orderId) return;
      if (status === 'approved') { stopPolling(); await refreshUser(); setStep(STEP.DONE); setTimeout(() => router.push('/wallet'), 4000); }
    };
    socket.on('payment:status-updated', handleUpdate);
    return () => socket.off('payment:status-updated', handleUpdate);
  }, [step, orderData]);

  const startPolling = (orderId) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/payment/order/${orderId}`);
        setPollCount(c => c + 1);
        if (data.data.order.status === 'approved') { stopPolling(); await refreshUser(); setStep(STEP.DONE); setTimeout(() => router.push('/wallet'), 4000); }
      } catch {}
    }, 5000);
  };

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const fetchSettings = async () => {
    try {
      const [s, sa] = await Promise.all([api.get('/payment/settings'), api.get('/wallet/sub-admins')]);
      setSettings(s.data.data);
      setSubAdmins((sa.data.data || []).filter(x => x.upiEnabled && x.hasStock));
      setCoins(s.data.data.minimumPurchaseCoins || 200);
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleProceed = async () => {
    if (!subAdminId) { toast.error('Pehle Sub-Admin choose karo'); return; }
    if (coins < (settings?.minimumPurchaseCoins || 200)) { toast.error(`Minimum ₹${settings?.minimumPurchaseCoins || 200}`); return; }
    setInitiating(true);
    try {
      const { data } = await api.post('/payment/initiate', { subAdminId, coinsRequested: coins, upiPlatform: 'other' });
      const d = data.data;
      setOrderData({ orderId: d.order._id, orderRef: d.order.orderReference, amountRupees: d.order.amountRupees, upiUrl: d.upiUrl, qrCodeDataUrl: d.qrCodeDataUrl, upiId: d.upiId, upiName: d.upiName });
      setStep(STEP.PAY);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setInitiating(false); }
  };

  const handleIPaid = async () => {
    if (!screenshot) { toast.error('Screenshot upload karo pehle'); return; }
    setInitiating(true);
    try {
      const fd = new FormData(); fd.append('screenshot', screenshot);
      await api.post(`/payment/screenshot/${orderData.orderId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post(`/payment/notify/${orderData.orderId}`).catch(() => {});
      setStep(STEP.VERIFYING);
      startPolling(orderData.orderId);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setInitiating(false); }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { toast.error('JPG/PNG/WebP only'); return; }
    if (file.size > 8*1024*1024) { toast.error('Max 8 MB'); return; }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); toast.success('Copied!'); setTimeout(() => setCopied(''), 2000); });
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: G.border, borderTopColor: G.gold }} />
    </div>
  );

  const amountRupees = coins * (settings?.coinPriceRupees || 1);

  return (
    <div className="space-y-5 animate-fade-in pb-6">

      {/* ── STEP 1: Select ───────────────────────────────────────────────── */}
      {step === STEP.SELECT && (
        <>
          <div>
            <h1 className="font-black text-2xl" style={{ color: G.text }}>Buy Coins</h1>
            <p className="text-sm" style={{ color: G.muted }}>1 coin = ₹1 · UPI se khareedein</p>
          </div>

          {/* Sub-admin chips */}
          <div>
            <p className="text-xs font-black mb-2" style={{ color: G.sub }}>1. Sub-Admin choose karo</p>
            {subAdmins.length === 0 ? (
              <div className="rounded-2xl p-4" style={{ background: '#fff3c4', border: '1.5px solid #e8c84a' }}>
                <p className="text-sm font-semibold" style={{ color: G.sub }}>⚠️ Abhi koi Sub-Admin available nahi hai</p>
                <p className="text-xs mt-1" style={{ color: G.muted }}>Thodi der baad try karo ya Support se contact karo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subAdmins.map(sa => (
                  <button key={sa._id} onClick={() => setSubAdminId(sa._id)}
                    className="w-full p-3 rounded-2xl text-left transition-all"
                    style={{
                      background: subAdminId === sa._id ? '#e8f8f0' : '#fffdf5',
                      border: `2px solid ${subAdminId === sa._id ? G.green : G.border}`,
                    }}>
                    <p className="font-bold text-sm" style={{ color: G.text }}>{sa.displayName}</p>
                    <p className="text-xs" style={{ color: G.muted }}>UPI payments enabled ✓</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount chips */}
          <div>
            <p className="text-xs font-black mb-2" style={{ color: G.sub }}>2. Amount choose karo</p>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {QUICK.map(a => (
                <button key={a} onClick={() => setCoins(a)}
                  className="py-2.5 rounded-xl font-bold text-xs transition-all"
                  style={coins === a ? G.goldBtn : { background: '#f0e6c8', color: G.sub, border: `1px solid ${G.border}` }}>
                  ₹{a}
                </button>
              ))}
            </div>
            <input type="number" className="input-field text-sm" placeholder="Custom amount"
              value={coins} min={settings?.minimumPurchaseCoins||200} max={settings?.maximumPurchaseCoins||10000}
              onChange={e => setCoins(Math.max(0, parseInt(e.target.value)||0))} />
          </div>

          {/* Summary */}
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#fff3c4,#fde68a)', border: '1.5px solid #e8c84a' }}>
            <div className="flex justify-between mb-2">
              <span className="text-sm" style={{ color: G.sub }}>You get</span>
              <span className="font-black text-xl" style={{ color: G.text }}>{coins.toLocaleString()} coins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: G.sub }}>You pay</span>
              <span className="font-black text-xl" style={{ color: G.text }}>₹{amountRupees.toLocaleString()}</span>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-2xl p-4 text-xs space-y-1.5" style={{ background: '#f0fdf4', border: '1.5px solid #a8dfc0' }}>
            <p className="font-black text-sm" style={{ color: '#1a3c24' }}>Kaise kaam karta hai:</p>
            <p style={{ color: '#1a3c24' }}>1️⃣ Sub-Admin choose karo → Proceed karo</p>
            <p style={{ color: '#1a3c24' }}>2️⃣ QR code scan karo ya UPI ID se payment karo</p>
            <p style={{ color: '#1a3c24' }}>3️⃣ Payment screenshot upload karo</p>
            <p style={{ color: '#1a3c24' }}>4️⃣ "I Have Paid" press karo → Sub-Admin verify karega</p>
            <p style={{ color: '#1a3c24' }}>5️⃣ Coins wallet mein instantly add ho jayenge ✅</p>
          </div>

          <button onClick={handleProceed} disabled={initiating || !subAdminId || coins < (settings?.minimumPurchaseCoins||200)}
            className="w-full py-4 rounded-full font-black text-base active:scale-95 transition-transform disabled:opacity-40"
            style={G.goldBtn}>
            {initiating ? 'Loading…' : `Proceed to Pay ₹${amountRupees}`}
          </button>
        </>
      )}

      {/* ── STEP 2: Pay ───────────────────────────────────────────────────── */}
      {step === STEP.PAY && orderData && (
        <>
          <div className="text-center">
            <h2 className="font-black text-xl" style={{ color: G.text }}>Payment Complete Karo</h2>
            <p className="text-sm mt-1" style={{ color: G.muted }}>QR scan karo ya UPI ID se pay karo</p>
          </div>

          {/* Amount */}
          <div className="rounded-2xl p-4 flex justify-between items-center" style={G.card}>
            <div>
              <p className="text-xs" style={{ color: G.muted }}>Exact amount pay karo</p>
              <p className="font-black text-2xl" style={{ color: G.text }}>₹{orderData.amountRupees}</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: G.muted }}>Milenge</p>
              <p className="font-black text-xl" style={{ color: G.gold }}>{coins} coins</p>
            </div>
          </div>

          {/* QR Code */}
          {orderData.qrCodeDataUrl && (
            <div className="rounded-2xl p-5 text-center" style={G.card}>
              <p className="text-xs font-bold mb-3" style={{ color: G.sub }}>📱 QR Code Scan Karo</p>
              <div className="inline-block p-3 bg-white rounded-2xl" style={{ border: `2px solid ${G.border}` }}>
                <img src={orderData.qrCodeDataUrl} alt="UPI QR" className="w-52 h-52 block" />
              </div>
              <p className="text-xs mt-2" style={{ color: G.muted }}>GPay / PhonePe / Paytm se scan karo</p>
            </div>
          )}

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: G.border }} />
            <span className="text-xs font-bold" style={{ color: G.muted }}>YA MANUALLY ENTER KARO</span>
            <div className="flex-1 h-px" style={{ background: G.border }} />
          </div>

          {/* UPI details */}
          <div className="rounded-2xl p-4 space-y-3" style={G.card}>
            {[
              { label: 'UPI ID (Payee)', value: orderData.upiId, key: 'upi' },
              { label: 'Amount (₹)',     value: String(orderData.amountRupees), key: 'amt' },
              { label: 'Remark / Note', value: orderData.orderRef, key: 'ref' },
            ].map(({ label, value, key }) => (
              <div key={key} className="rounded-xl p-3 flex items-center justify-between"
                style={{ background: '#f9f5eb', border: `1px solid ${G.border}` }}>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: G.muted }}>{label}</p>
                  <p className="font-black text-sm" style={{ color: G.text }}>{value}</p>
                </div>
                <button onClick={() => copy(value, key)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: '#fff3c4', border: `1px solid ${G.border}` }}>
                  {copied === key
                    ? <Check size={14} style={{ color: G.green }} />
                    : <Copy size={14} style={{ color: G.gold }} />}
                </button>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div className="rounded-2xl p-3 text-xs" style={{ background: '#fff3c4', border: '1.5px solid #e8c84a' }}>
            <p className="font-bold mb-1" style={{ color: G.sub }}>⚠️ "I Have Paid" press karne se pehle:</p>
            <p style={{ color: G.sub }}>• UPI app mein payment complete ho gayi ho</p>
            <p style={{ color: G.sub }}>• Remark mein likha ho: <strong>{orderData.orderRef}</strong></p>
          </div>

          {/* Screenshot upload */}
          <div className="rounded-2xl p-4 space-y-3" style={G.card}>
            <p className="font-black text-sm" style={{ color: G.text }}>📷 Payment Screenshot Upload Karo <span style={{ color: '#dc2626' }}>*</span></p>
            {screenshotPreview ? (
              <div className="relative">
                <img src={screenshotPreview} alt="screenshot" className="w-full max-h-48 object-contain rounded-xl"
                  style={{ border: `1.5px solid ${G.border}` }} />
                <button onClick={() => { setScreenshot(null); setScreenshotPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ background: '#dc2626', color: '#fff' }}>✕</button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl p-5 text-center"
                style={{ border: `2px dashed ${G.border}`, background: '#f9f5eb' }}>
                <Camera size={24} className="mx-auto mb-2" style={{ color: G.gold }} />
                <p className="font-semibold text-sm" style={{ color: G.sub }}>Tap karke screenshot upload karo</p>
                <p className="text-xs mt-0.5" style={{ color: G.muted }}>JPG, PNG, WebP — max 8 MB</p>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleScreenshotChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setStep(STEP.SELECT)}
              className="py-3.5 rounded-full font-bold text-sm"
              style={{ background: '#f0e6c8', color: G.sub, border: `1.5px solid ${G.border}` }}>
              ← Wapas
            </button>
            <button onClick={handleIPaid} disabled={!screenshot || initiating}
              className="py-3.5 rounded-full font-black text-sm active:scale-95 transition-transform disabled:opacity-40"
              style={{ background: 'linear-gradient(to bottom,#2ecc71,#0a7a3c)', color: '#fff', boxShadow: '0 3px 10px rgba(10,122,60,0.3)' }}>
              {initiating ? '…' : '✓ I Have Paid'}
            </button>
          </div>
        </>
      )}

      {/* ── STEP 3: Verifying ────────────────────────────────────────────── */}
      {step === STEP.VERIFYING && (
        <div className="rounded-2xl p-10 text-center space-y-5" style={G.card}>
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 animate-spin"
              style={{ borderColor: G.border, borderTopColor: G.gold }} />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">⏳</div>
          </div>
          <div>
            <p className="font-black text-lg" style={{ color: G.text }}>Verification ho rahi hai</p>
            <p className="text-sm mt-2" style={{ color: G.muted }}>Sub-Admin verify kar raha hai. Kuch minuts mein coins add ho jayenge.</p>
          </div>
          <p className="text-xs" style={{ color: G.muted }}>Har 5 seconds pe check ho raha hai · {pollCount} check</p>
        </div>
      )}

      {/* ── STEP 4: Done ─────────────────────────────────────────────────── */}
      {step === STEP.DONE && (
        <div className="rounded-2xl p-10 text-center space-y-5"
          style={{ background: '#e8f8f0', border: `1.5px solid ${G.green}` }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto"
            style={{ background: '#d1fae5', border: `2px solid ${G.green}` }}>
            ✅
          </div>
          <div>
            <p className="font-black text-2xl" style={{ color: G.text }}>Coins Aa Gaye! 🎉</p>
            <p className="font-black text-xl" style={{ color: G.green }}>+{coins.toLocaleString()} coins added</p>
          </div>
          <p className="text-sm" style={{ color: G.muted }}>Wallet mein redirect ho raha hai…</p>
          <button onClick={() => router.push('/wallet')}
            className="w-full py-3.5 rounded-full font-black text-sm"
            style={{ background: 'linear-gradient(to bottom,#2ecc71,#0a7a3c)', color: '#fff' }}>
            Wallet Dekho →
          </button>
        </div>
      )}
    </div>
  );
}
