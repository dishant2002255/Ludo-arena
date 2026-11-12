'use client';
import { useEffect, useState } from 'react';
import { Settings, AlertTriangle, CheckCircle, Coins, Smartphone } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({});

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/payment/admin/settings');
      setSettings(data.data.settings);
      setForm({
        upiEnabled: data.data.settings.upiEnabled,
        upiId: data.data.settings.upiId || '',
        upiName: data.data.settings.upiName || '',
        upiNote: data.data.settings.upiNote || 'Ludo Arena Coins Purchase',
        coinPriceRupees: data.data.settings.coinPriceRupees || 1,
        minimumPurchaseCoins: data.data.settings.minimumPurchaseCoins || 200,
        maximumPurchaseCoins: data.data.settings.maximumPurchaseCoins || 10000,
        orderExpiryMinutes: data.data.settings.orderExpiryMinutes || 30,
        adminAlarmEnabled: data.data.settings.adminAlarmEnabled !== false,
        upiApps: { gpay:true, phonepe:true, paytm:true, bhim:true, ...data.data.settings.upiApps },
      });
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (form.upiEnabled && !form.upiId) {
      toast.error('UPI ID is required to enable payments');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/payment/admin/settings', form);
      toast.success('Settings saved!');
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="max-w-2xl space-y-4">
      {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-20 rounded-xl"/>)}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Platform Settings</h1>
        <p className="text-slate-400 mt-1">Configure UPI payment and coin purchase settings</p>
      </div>

      {/* Warning banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="text-amber-300 font-semibold">Important Notice</p>
          <p className="text-amber-400/70 mt-1">
            Enabling payments means you personally verify every UPI transfer in your bank account
            before approving. Never approve a payment you haven't received. Coins are virtual only
            and have no monetary value.
          </p>
        </div>
      </div>

      {/* Payment Enable/Disable */}
      <div className="game-card p-6 space-y-5">
        <h2 className="section-title flex items-center gap-2">
          <Coins size={18} className="text-yellow-400" /> Coin Purchase Settings
        </h2>

        <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
          <div>
            <p className="text-white font-medium">Enable UPI Coin Purchases</p>
            <p className="text-xs text-slate-400 mt-0.5">Users can buy coins via UPI when this is ON</p>
          </div>
          <button
            onClick={() => setForm(f => ({...f, upiEnabled: !f.upiEnabled}))}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300
              ${form.upiEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300
              ${form.upiEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        {!form.upiEnabled && (
          <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5 text-xs text-slate-500 text-center">
            🔒 UPI Payment Link — Deferred Configuration (not currently active)
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Your UPI ID *"
            value={form.upiId}
            onChange={e => setForm(f=>({...f,upiId:e.target.value}))}
            placeholder="e.g. yourname@upi or 9999999999@paytm"
            hint="This is your UPI ID where users will send money"
          />
          <Input
            label="Your Name / Business Name"
            value={form.upiName}
            onChange={e => setForm(f=>({...f,upiName:e.target.value}))}
            placeholder="e.g. Ludo Arena"
          />
          <Input
            label="Payment Note (shown to user)"
            value={form.upiNote}
            onChange={e => setForm(f=>({...f,upiNote:e.target.value}))}
            placeholder="Ludo Arena Coins Purchase"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="₹ per Coin"
            type="number"
            min={1}
            value={form.coinPriceRupees}
            onChange={e => setForm(f=>({...f,coinPriceRupees:parseInt(e.target.value)||1}))}
          />
          <Input
            label="Min Coins"
            type="number"
            min={100}
            value={form.minimumPurchaseCoins}
            onChange={e => setForm(f=>({...f,minimumPurchaseCoins:parseInt(e.target.value)||200}))}
          />
          <Input
            label="Max Coins"
            type="number"
            value={form.maximumPurchaseCoins}
            onChange={e => setForm(f=>({...f,maximumPurchaseCoins:parseInt(e.target.value)||10000}))}
          />
        </div>

        <Input
          label="Order Expiry (minutes)"
          type="number"
          min={5}
          max={120}
          value={form.orderExpiryMinutes}
          onChange={e => setForm(f=>({...f,orderExpiryMinutes:parseInt(e.target.value)||30}))}
          hint="Pending orders auto-expire after this many minutes"
        />
      </div>

      {/* UPI Apps */}
      <div className="game-card p-6 space-y-4">
        <h2 className="section-title flex items-center gap-2">
          <Smartphone size={18} className="text-purple-400" /> Enabled UPI Apps
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[['gpay','Google Pay','🟢'],['phonepe','PhonePe','🟣'],['paytm','Paytm','🔵'],['bhim','BHIM UPI','🟠']].map(([id,label,emoji]) => (
            <div key={id} className={`flex items-center justify-between p-3 rounded-xl border transition-all
              ${form.upiApps?.[id] ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center gap-2">
                <span>{emoji}</span>
                <span className="text-sm text-white">{label}</span>
              </div>
              <button
                onClick={() => setForm(f=>({...f, upiApps:{...f.upiApps, [id]:!f.upiApps?.[id]}}))}
                className={`w-10 h-5 rounded-full transition-colors ${form.upiApps?.[id] ? 'bg-purple-500' : 'bg-slate-600'}`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white shadow m-0.5 transition-transform ${form.upiApps?.[id] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Alarm Settings */}
      <div className="game-card p-6 space-y-3">
        <h2 className="section-title">Admin Alarm Settings</h2>
        <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5">
          <div>
            <p className="text-white text-sm font-medium">Payment Alarm Sound</p>
            <p className="text-xs text-slate-400">Play alarm when new payment received</p>
          </div>
          <button
            onClick={() => setForm(f=>({...f,adminAlarmEnabled:!f.adminAlarmEnabled}))}
            className={`w-10 h-5 rounded-full transition-colors ${form.adminAlarmEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white shadow m-0.5 transition-transform ${form.adminAlarmEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <Button fullWidth loading={saving} onClick={handleSave} className="text-lg py-4">
        <CheckCircle size={18} /> Save Settings
      </Button>
    </div>
  );
}
