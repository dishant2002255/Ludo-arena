'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Trophy, Clock, ChevronRight, CheckCircle, Lock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const STATUS_LABEL = {
  draft:            'Draft',
  open:             'Open',
  full:             'Full',
  waiting_for_admin:'Waiting',
  room_published:   'Room Ready',
  result_pending:   'Results',
  completed:        'Completed',
  cancelled:        'Cancelled',
};

const STATUS_COLOR = {
  open:             'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  full:             'text-blue-400   bg-blue-500/10   border-blue-500/30',
  waiting_for_admin:'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  room_published:   'text-purple-400 bg-purple-500/10 border-purple-500/30',
  result_pending:   'text-orange-400 bg-orange-500/10 border-orange-500/30',
  completed:        'text-slate-400  bg-slate-500/10  border-slate-500/30',
  cancelled:        'text-red-400    bg-red-500/10    border-red-500/30',
};

export default function TournamentCard({ tournament, isJoined = false, index = 0 }) {
  const slots     = tournament.requiredPlayers - (tournament.participants?.length || 0);
  const statusCls = STATUS_COLOR[tournament.status] || STATUS_COLOR.cancelled;
  const label     = STATUS_LABEL[tournament.status] || tournament.status;

  return (
    <motion.div
      className="game-card flex flex-col overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      {/* Banner */}
      <div className="relative h-36 bg-gradient-to-br from-purple-900/60 to-indigo-900/60 overflow-hidden">
        {tournament.bannerUrl ? (
          <img
            src={tournament.bannerUrl}
            alt={tournament.title}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Trophy size={48} className="text-purple-400 opacity-50" />
          </div>
        )}
        {/* Status pill */}
        <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold border ${statusCls}`}>
          {label}
        </span>
        {isJoined && (
          <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <CheckCircle size={12} /> Joined
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="text-white font-semibold text-base line-clamp-1">{tournament.title}</h3>
        {tournament.description && (
          <p className="text-slate-400 text-xs line-clamp-2">{tournament.description}</p>
        )}

        {/* Slots & players */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users size={14} />
            <span>{tournament.participants?.length || 0}/{tournament.requiredPlayers} players</span>
          </div>
          {tournament.winnerReward > 0 && (
            <div className="flex items-center gap-1 text-yellow-400 font-semibold text-xs">
              <Trophy size={12} />
              {tournament.winnerReward} coins
            </div>
          )}
        </div>

        {/* Slot bar */}
        <div className="w-full bg-white/5 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${((tournament.participants?.length || 0) / tournament.requiredPlayers) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          {slots > 0 ? `${slots} slot${slots !== 1 ? 's' : ''} available` : 'No slots remaining'}
        </p>

        <Link href={`/tournaments/${tournament._id}`} className="mt-auto">
          <Button fullWidth variant={isJoined ? 'secondary' : 'primary'} size="sm">
            {isJoined ? 'View Tournament' : tournament.status === 'open' ? 'Join Tournament' : 'View Details'}
            <ChevronRight size={16} />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
