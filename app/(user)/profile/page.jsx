'use client';
import { useState } from 'react';
import { User } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/Card';
import { Trophy, Gamepad2, TrendingUp, Coins } from 'lucide-react';
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

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Profile</h1>
        <p className="text-slate-400 mt-1">Manage your account details</p>
      </div>

      <div className="game-card p-8">
        <div className="flex items-center gap-6 mb-8">
          <Avatar username={user?.username} size="2xl" />
          <div>
            <h2 className="text-xl font-bold text-white">{user?.username}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge-purple">Player</span>
              <span className="text-xs text-slate-500">Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2026'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Username"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            icon={<User size={16} />}
          />
          <Input label="Email" value={user?.email || ''} disabled hint="Email cannot be changed" />
          <Button type="submit" loading={saving}>Save Changes</Button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Wins" value={user?.totalWins || 0} icon={<Trophy size={20} />} color="green" />
        <StatCard title="Matches" value={user?.totalMatches || 0} icon={<Gamepad2 size={20} />} color="purple" />
        <StatCard title="Win Rate" value={`${winRate}%`} icon={<TrendingUp size={20} />} color="blue" />
        <StatCard title="Coins" value={user?.walletBalance?.toLocaleString() || 0} icon={<Coins size={20} />} color="yellow" />
      </div>
    </div>
  );
}
