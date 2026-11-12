'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Gamepad2, TrendingUp, Coins, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { StatSkeleton, CardSkeleton } from '@/components/ui/LoadingSkeleton';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import TournamentCard from '@/components/tournament/TournamentCard';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { user, refreshUser } = useAuthStore();
  const [dashboard, setDashboard]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusStatus, setBonusStatus]     = useState(null);
  const [openTournaments, setOpenTournaments] = useState([]);
  const [myTournaments, setMyTournaments]     = useState([]);
  const [tourLoading, setTourLoading]         = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchBonusStatus();
    fetchTournaments();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/users/dashboard');
      setDashboard(data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load dashboard';
      setError(msg);
      if (err.response?.status !== 401) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchBonusStatus = async () => {
    try {
      const { data } = await api.get('/wallet/balance');
      setBonusStatus(data.data);
    } catch {}
  };

  const fetchTournaments = async () => {
    setTourLoading(true);
    try {
      const [openRes, myRes] = await Promise.all([
        api.get('/tournaments', { params: { status: 'open', limit: 3 } }),
        api.get('/tournaments/my', { params: { limit: 3 } }),
      ]);
      setOpenTournaments(openRes.data.data || []);
      setMyTournaments(myRes.data.data || []);
    } catch {}
    finally { setTourLoading(false); }
  };

  const claimBonus = async () => {
    setClaimingBonus(true);
    try {
      const { data } = await api.post('/wallet/daily-bonus/claim');
      toast.success(data.message);
      await refreshUser();
      await fetchBonusStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim bonus');
    } finally {
      setClaimingBonus(false);
    }
  };

  const statsUser      = dashboard?.user || user;
  const winRate        = statsUser?.totalMatches > 0
    ? Math.round((statsUser.totalWins / statsUser.totalMatches) * 100) : 0;
  const myTournamentIds = new Set(myTournaments.map(t => t._id));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar username={user?.username} size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-white font-display">
              Welcome back, <span className="gradient-text">{user?.username}</span>! 👋
            </h1>
            <p className="text-slate-400 text-sm">Ready for a tournament?</p>
          </div>
        </div>
        <Link href="/tournaments">
          <Button icon={<Trophy size={18} />}>Browse Tournaments</Button>
        </Link>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="game-card p-4 border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm flex-1">{error}</p>
          <Button size="sm" variant="secondary" onClick={fetchDashboard}>Retry</Button>
        </div>
      )}

      {/* Daily bonus */}
      {bonusStatus?.canClaimDaily && (
        <div className="game-card p-5 border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <Calendar size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Daily Bonus Available!</p>
                <p className="text-slate-400 text-sm">Claim your 100 free coins</p>
              </div>
            </div>
            <Button variant="success" loading={claimingBonus} onClick={claimBonus} size="sm">
              <Coins size={16} /> Claim 100 Coins
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <StatCard title="Coin Balance"   value={(user?.walletBalance||0).toLocaleString()} icon={<Coins size={22}/>}     color="yellow"/>
            <StatCard title="Total Wins"     value={statsUser?.totalWins ?? 0}                 icon={<Trophy size={22}/>}     color="green"/>
            <StatCard title="Matches Played" value={statsUser?.totalMatches ?? 0}              icon={<Gamepad2 size={22}/>}   color="purple"/>
            <StatCard title="Win Rate"       value={`${winRate}%`}                             icon={<TrendingUp size={22}/>} color="blue"/>
          </>
        )}
      </div>

      {/* My Tournaments */}
      {myTournaments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">My Tournaments</h2>
            <Link href="/tournaments" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {myTournaments.slice(0, 3).map((t, i) => (
              <TournamentCard key={t._id} tournament={t} isJoined={true} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Open Tournaments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Open Tournaments</h2>
          <Link href="/tournaments" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {tourLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : openTournaments.length === 0 ? (
          <div className="game-card p-8 text-center">
            <Trophy size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No open tournaments right now</p>
            <p className="text-slate-500 text-sm mt-1">Admin will post new tournaments soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {openTournaments.map((t, i) => (
              <TournamentCard key={t._id} tournament={t} isJoined={myTournamentIds.has(t._id)} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Games */}
      {dashboard?.recentGames?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Matches</h2>
            <Link href="/profile" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard.recentGames.map((game) => {
              const isWinner = game.winner?.toString() === user?._id?.toString();
              const myPlayer = game.players?.find(p => p.user?.toString() === user?._id?.toString());
              return (
                <div key={game._id} className="game-card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                      ${isWinner ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                                 : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
                      {isWinner ? 'W' : 'L'}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{game.match?.name || 'Ludo Match'}</p>
                      <p className="text-slate-500 text-xs">
                        {game.completedAt ? formatDistanceToNow(new Date(game.completedAt), { addSuffix: true }) : ''}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${isWinner ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isWinner ? `+${myPlayer?.coinsEarned || 0}` : `-${myPlayer?.coinsSpent || 0}`} coins
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
