'use client';
import { useState } from 'react';
import { User } from 'lucide-react';
import Input from '@/components/ui/Input';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';

export default function ProfilePage() {
  const { user, refreshUser } = useAuthStore();
  const [form, setForm] = useState({ username: user?.username || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/profile', form);
      await refreshUser();
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const winRate = user?.totalMatches > 0
    ? Math.round((user.totalWins / user.totalMatches) * 100) : 0;

  const stats = [
    { label: 'Total Wins',   value: user?.totalWins || 0,                    icon: '🏆', color: '#0a7a3c', bg: '#e8f8f0' },
    { label: 'Battles',      value: user?.totalMatches || 0,                  icon: '⚔️', color: '#5b21b6', bg: '#ede9fe' },
    { label: 'Win Rate',     value: `${winRate}%`,                            icon: '📈', color: '#c9960a', bg: '#fff3c4' },
    { label: 'Balance',      value: `₹${user?.walletBalance?.toLocaleString() || 0}`, icon: '💰', color: '#3b2800', bg: '#fdf6e3' },
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-6">

      {/* Header */}
      <div>
        <h1 className="font-black text-2xl" style={{ color: '#3b2800' }}>My Profile</h1>
        <p className="text-sm" style={{ color: '#a09070' }}>Account details manage karein</p>
      </div>

      {/* Avatar card */}
      <div className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg,#fff3c4,#fde68a)', border: '1.5px solid #e8c84a' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#f5c842,#c9960a)', color: '#3b2800', boxShadow: '0 3px 10px rgba(201,150,10,0.3)' }}>
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <p className="font-black text-lg" style={{ color: '#3b2800' }}>{user?.username}</p>
          <p className="text-sm" style={{ color: '#7a5a00' }}>{user?.email}</p>
          <p className="text-xs mt-1" style={{ color: '#a09070' }}>
            Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}
          </p>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: '#fffdf5', border: '1.5px solid #e8d49a' }}>
        <p className="font-black text-sm" style={{ color: '#3b2800' }}>Edit Profile</p>

        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Username" value={form.username} icon={<User size={16} />}
            onChange={e => setForm({ ...form, username: e.target.value })} />
          <Input label="Email" value={user?.email || ''} disabled hint="Email cannot be changed" />

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-full font-black text-sm active:scale-95 transition-transform disabled:opacity-50"
            style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800', boxShadow: '0 3px 10px rgba(201,150,10,0.3)' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon, color, bg }) => (
          <div key={label} className="rounded-2xl p-4"
            style={{ background: bg, border: '1.5px solid #e8d49a' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{icon}</span>
              <p className="text-xs font-semibold" style={{ color: '#7a5a00' }}>{label}</p>
            </div>
            <p className="font-black text-xl" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
