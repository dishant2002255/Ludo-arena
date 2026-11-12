'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Gamepad2, DoorOpen, Coins, Trophy, Activity, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { StatSkeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboardPage() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/dashboard');
      setStats(data.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1">Platform overview and statistics</p>
      </div>

      {/* Tournament Stats */}
      <div>
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-yellow-400" /> Tournament Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading ? Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />) : (
            <>
              <StatCard title="Open"           value={stats?.openTournaments || 0}         icon={<Gamepad2 size={18} />}       color="green"  />
              <StatCard title="Full"           value={stats?.fullTournaments || 0}          icon={<Users size={18} />}          color="blue"   />
              <StatCard title="Waiting"        value={stats?.waitingTournaments || 0}       icon={<Clock size={18} />}          color="yellow" />
              <StatCard title="Pending Review" value={stats?.pendingVerifications || 0}     icon={<AlertTriangle size={18} />}  color="red"    />
              <StatCard title="Completed"      value={stats?.completedTournaments || 0}     icon={<CheckCircle size={18} />}    color="purple" />
            </>
          )}
        </div>

        {stats?.waitingTournaments > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
            <Clock size={16} className="text-yellow-400 shrink-0" />
            <p className="text-yellow-300 text-sm">
              <strong>{stats.waitingTournaments}</strong> tournament{stats.waitingTournaments !== 1 ? 's' : ''} waiting for room details.
            </p>
            <Link href="/admin/tournaments" className="ml-auto text-xs text-yellow-400 hover:text-yellow-300 underline shrink-0">View</Link>
          </div>
        )}

        {stats?.pendingVerifications > 0 && (
          <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">
              <strong>{stats.pendingVerifications}</strong> tournament{stats.pendingVerifications !== 1 ? 's' : ''} with pending results.
            </p>
            <Link href="/admin/tournaments" className="ml-auto text-xs text-red-400 hover:text-red-300 underline shrink-0">Review</Link>
          </div>
        )}
      </div>

      {/* Platform Stats */}
      <div>
        <h2 className="section-title mb-4">Platform Stats</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {loading ? Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />) : (
            <>
              <StatCard title="Total Users"   value={stats?.totalUsers || 0}              icon={<Users size={22} />}    color="purple" />
              <StatCard title="Active Users"  value={stats?.activeUsers || 0}             icon={<Activity size={22} />} color="green"  />
              <StatCard title="Total Matches" value={stats?.totalMatches || 0}            icon={<Gamepad2 size={22} />} color="blue"   />
              <StatCard title="Active Rooms"  value={stats?.activeRooms || 0}             icon={<DoorOpen size={22} />} color="yellow" />
              <StatCard title="Completed"     value={stats?.completedMatches || 0}        icon={<Trophy size={22} />}   color="green"  />
              <StatCard title="Coins Out"     value={stats?.totalCoinsDistributed || 0}   icon={<Coins size={22} />}    color="yellow" />
            </>
          )}
        </div>
      </div>

      {/* Coin Requests alert */}
      {(stats?.pendingCoinRequests || 0) > 0 && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
          <Coins size={16} className="text-blue-400 shrink-0" />
          <p className="text-blue-300 text-sm">
            <strong>{stats.pendingCoinRequests}</strong> pending free coin request{stats.pendingCoinRequests !== 1 ? 's' : ''}.
          </p>
          <Link href="/admin/wallet" className="ml-auto text-xs text-blue-400 hover:text-blue-300 underline shrink-0">Review</Link>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="section-title mb-4">Recent Admin Activity</h2>
        <div className="game-card">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 flex-1 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : stats?.recentActivity?.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No activity yet</div>
          ) : (
            <div className="divide-y divide-white/5">
              {stats?.recentActivity?.map((log) => (
                <div key={log._id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white font-medium capitalize">{log.action?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500">{log.admin?.username || 'Admin'}</p>
                  </div>
                  <p className="text-xs text-slate-500 shrink-0">
                    {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
