'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Users, Clock, CheckCircle, Upload, Eye, EyeOff,
  Copy, Check, AlertCircle, ChevronLeft, RefreshCw
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { connectSocket, getSocket } from '@/lib/socket/socket';
import { toast } from '@/store/toastStore';
import Link from 'next/link';

const SLOT_COLORS = ['red', 'green', 'yellow', 'blue'];
const COLOR_RING  = { red:'ring-red-500', green:'ring-emerald-500', yellow:'ring-yellow-500', blue:'ring-blue-500' };

const STATUS_STEPS = [
  { key: 'open',             label: 'Registration Open' },
  { key: 'waiting_for_admin',label: 'Waiting for Room' },
  { key: 'room_published',   label: 'Room Published' },
  { key: 'result_pending',   label: 'Submit Results' },
  { key: 'completed',        label: 'Completed' },
];

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router  = useRouter();
  const { user } = useAuthStore();

  const [data, setData]           = useState(null); // { tournament, isParticipant }
  const [loading, setLoading]     = useState(true);
  const [joining, setJoining]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [copied, setCopied]       = useState(false);
  const [submitModal, setSubmitModal] = useState(false);
  const [submitForm, setSubmitForm]   = useState({ claimedResult: 'winner', remarks: '', file: null });
  const [submitting, setSubmitting]   = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    fetchTournament();
    // Subscribe to real-time updates
    const socket = connectSocket();
    socket.emit('tournament:subscribe', { tournamentId: id });

    const refresh = () => fetchTournament();
    socket.on('tournament:joined',           refresh);
    socket.on('tournament:full',             refresh);
    socket.on('tournament:room-published',   refresh);
    socket.on('tournament:verification-updated', refresh);
    socket.on('tournament:completed',        refresh);
    socket.on('tournament:cancelled',        refresh);

    return () => {
      socket.emit('tournament:unsubscribe', { tournamentId: id });
      ['tournament:joined','tournament:full','tournament:room-published',
       'tournament:verification-updated','tournament:completed','tournament:cancelled']
        .forEach(e => socket.off(e, refresh));
    };
  }, [id]);

  const fetchTournament = async () => {
    try {
      const { data: res } = await api.get(`/tournaments/${id}`);
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 404) toast.error('Tournament not found');
      else toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.post(`/tournaments/${id}/join`);
      toast.success('Successfully joined the tournament!');
      await fetchTournament();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(tournament.externalRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.info('Room ID copied!');
  };

  const handleSubmit = async () => {
    if (!submitForm.file) { toast.error('Please select a screenshot'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('screenshot', submitForm.file);
      fd.append('claimedResult', submitForm.claimedResult);
      fd.append('remarks', submitForm.remarks);
      await api.post(`/tournaments/${id}/submit-result`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Result submitted!');
      setSubmitModal(false);
      setSubmitForm({ claimedResult: 'winner', remarks: '', file: null });
      await fetchTournament();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-32 rounded-xl"/>)}
      </div>
    </div>
  );

  if (!data) return (
    <div className="game-card p-16 text-center">
      <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
      <p className="text-white font-medium">Tournament not found</p>
      <Link href="/tournaments"><Button size="sm" className="mt-4" variant="secondary">Back to Tournaments</Button></Link>
    </div>
  );

  const { tournament, isParticipant } = data;
  const isCancelled  = tournament.status === 'cancelled';
  const isCompleted  = tournament.status === 'completed';
  const canJoin      = tournament.status === 'open' && tournament.registrationOpen && !isParticipant;
  const isFull       = tournament.participants?.length >= tournament.requiredPlayers;
  const stepIdx      = STATUS_STEPS.findIndex(s => s.key === tournament.status);
  const mySubmission = tournament.submissions?.find(s => s.user?._id === user?._id || s.user === user?._id);
  const canSubmit    = isParticipant && ['room_published','result_pending'].includes(tournament.status);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Back */}
      <Link href="/tournaments" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        <ChevronLeft size={16} /> Back to Tournaments
      </Link>

      {/* Banner + Title */}
      <div className="game-card overflow-hidden">
        <div className="relative h-48 bg-gradient-to-br from-purple-900/60 to-indigo-900/80">
          {tournament.bannerUrl ? (
            <img src={tournament.bannerUrl} alt={tournament.title} className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Trophy size={64} className="text-purple-400 opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <h1 className="text-2xl font-bold text-white font-display">{tournament.title}</h1>
            {tournament.winnerReward > 0 && (
              <p className="text-yellow-400 text-sm font-semibold mt-1">🏆 Winner earns {tournament.winnerReward} coins</p>
            )}
          </div>
        </div>

        {/* Progress steps */}
        {!isCancelled && (
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STATUS_STEPS.map((step, i) => (
                <div key={step.key} className="flex items-center gap-2 shrink-0">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${i < stepIdx ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      i === stepIdx ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                      'bg-white/5 text-slate-500 border border-white/5'}`}>
                    {i < stepIdx ? <CheckCircle size={12} /> : <span>{i+1}</span>}
                    {step.label}
                  </div>
                  {i < STATUS_STEPS.length - 1 && <div className="w-4 h-px bg-white/10 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          {tournament.description && <p className="text-slate-300 text-sm leading-relaxed">{tournament.description}</p>}
          {isCancelled && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              ❌ This tournament has been cancelled.{tournament.cancelReason ? ` Reason: ${tournament.cancelReason}` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Players */}
        <div className="game-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Players ({tournament.participants?.length || 0}/{tournament.requiredPlayers})</h2>
            <Button variant="ghost" size="sm" onClick={fetchTournament} icon={<RefreshCw size={14}/>}>
              Refresh
            </Button>
          </div>
          <div className="space-y-3">
            {Array.from({ length: tournament.requiredPlayers }).map((_, i) => {
              const p = tournament.participants?.[i];
              const color = SLOT_COLORS[i];
              return (
                <motion.div key={i} className={`flex items-center gap-3 p-3 rounded-xl border
                  ${p ? 'bg-white/5 border-white/10' : 'bg-white/2 border-white/5 opacity-50'}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}>
                  {p ? (
                    <>
                      <Avatar username={p.user?.username || '?'} size="sm" color={color} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {p.user?.username || 'Player'}
                          {p.user?._id === user?._id && <span className="text-purple-400 ml-1 text-xs">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">{color}</p>
                      </div>
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                    </>
                  ) : (
                    <>
                      <div className={`w-8 h-8 rounded-full border-2 border-dashed opacity-30 border-${color === 'red' ? 'red' : color === 'green' ? 'emerald' : color === 'yellow' ? 'yellow' : 'blue'}-500`} />
                      <p className="text-slate-500 text-sm">Waiting for player…</p>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Join button */}
          {canJoin && (
            <Button fullWidth loading={joining} onClick={handleJoin}>
              Join Tournament
            </Button>
          )}
          {!isParticipant && !canJoin && !isCancelled && !isCompleted && (
            <p className="text-center text-slate-500 text-sm">Registration is currently closed</p>
          )}
          {isFull && !isParticipant && (
            <p className="text-center text-slate-500 text-sm">Tournament is full</p>
          )}
        </div>

        {/* Right panel: waiting message, room details, or results */}
        <div className="game-card p-6 space-y-4">
          {/* Waiting for admin */}
          {tournament.status === 'waiting_for_admin' && isParticipant && (
            <div className="text-center py-6 space-y-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                <Clock size={40} className="text-yellow-400 mx-auto" />
              </motion.div>
              <h3 className="text-white font-semibold">All Players Have Joined!</h3>
              <p className="text-slate-400 text-sm">
                Waiting for admin to create and share the Ludo room. You will receive a notification when the room is ready.
              </p>
            </div>
          )}

          {/* Room published */}
          {['room_published','result_pending'].includes(tournament.status) && isParticipant && (
            <div className="space-y-4">
              <h2 className="section-title flex items-center gap-2">
                🎮 Room Details
              </h2>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-sm">Platform</span>
                  <span className="text-white font-medium text-sm">{tournament.externalPlatform}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-sm">Room ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-purple-300 font-mono text-sm bg-purple-500/10 px-2 py-0.5 rounded">
                      {tournament.externalRoomId}
                    </code>
                    <button onClick={copyRoomId} className="text-slate-400 hover:text-white transition-colors">
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                {tournament.externalRoomPassword && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-sm">Password</span>
                    <div className="flex items-center gap-2">
                      <code className="text-purple-300 font-mono text-sm bg-purple-500/10 px-2 py-0.5 rounded">
                        {showPass ? tournament.externalRoomPassword : '••••••'}
                      </code>
                      <button onClick={() => setShowPass(v=>!v)} className="text-slate-400 hover:text-white transition-colors">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}
                {tournament.roomInstructions && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Instructions</p>
                    <p className="text-sm text-slate-300">{tournament.roomInstructions}</p>
                  </div>
                )}
              </div>

              {/* Submit result */}
              {canSubmit && (
                <div className="space-y-2">
                  {mySubmission ? (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <p className="text-sm text-white font-medium">Your Submission</p>
                      <p className="text-xs text-slate-400 capitalize">
                        Claimed: <span className="text-white">{mySubmission.claimedResult}</span> ·
                        Status: <span className={`font-semibold ${mySubmission.status === 'approved' ? 'text-emerald-400' : mySubmission.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {mySubmission.status?.replace(/_/g, ' ')}
                        </span>
                      </p>
                      {mySubmission.adminRemarks && (
                        <p className="text-xs text-slate-500 italic">Admin: {mySubmission.adminRemarks}</p>
                      )}
                      {mySubmission.status === 'resubmission_required' && (
                        <Button size="sm" variant="primary" fullWidth onClick={() => setSubmitModal(true)} className="mt-2">
                          Resubmit Screenshot
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button fullWidth variant="success" icon={<Upload size={16}/>} onClick={() => setSubmitModal(true)}>
                      Submit Result Screenshot
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completed */}
          {isCompleted && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
                <Trophy size={32} className="text-yellow-400" />
              </div>
              <h3 className="text-white font-semibold">Tournament Completed!</h3>
              {tournament.verifiedWinner && (
                <div className="flex items-center justify-center gap-2">
                  <Avatar username={tournament.verifiedWinner?.username} size="sm" />
                  <div className="text-left">
                    <p className="text-xs text-slate-400">Winner</p>
                    <p className="text-white font-medium">{tournament.verifiedWinner?.username}</p>
                  </div>
                </div>
              )}
              {tournament.winnerReward > 0 && (
                <p className="text-yellow-400 text-sm">+{tournament.winnerReward} coins awarded</p>
              )}
            </div>
          )}

          {/* Rules */}
          {tournament.rules && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-sm font-medium text-slate-300 mb-2">Rules</p>
              <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">{tournament.rules}</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Result Modal */}
      <Modal isOpen={submitModal} onClose={() => setSubmitModal(false)} title="Submit Result Screenshot" size="sm">
        <div className="p-6 space-y-5">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            Upload your screenshot as proof. Admin will verify the result. Supported: JPG, PNG, WebP (max 8 MB).
          </div>

          {/* File picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Screenshot</label>
            <div
              className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/40 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {submitForm.file ? (
                <div>
                  <p className="text-emerald-400 text-sm font-medium">{submitForm.file.name}</p>
                  <p className="text-xs text-slate-500">{(submitForm.file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload size={28} className="text-slate-500 mx-auto" />
                  <p className="text-slate-400 text-sm">Click to upload screenshot</p>
                  <p className="text-xs text-slate-600">JPG, PNG, WebP — max 8 MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
              onChange={e => setSubmitForm(f => ({ ...f, file: e.target.files[0] || null }))} />
          </div>

          {/* Claimed result */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Your Result</label>
            <div className="grid grid-cols-2 gap-3">
              {['winner','lost'].map(r => (
                <button key={r} onClick={() => setSubmitForm(f=>({...f, claimedResult:r}))}
                  className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all
                    ${submitForm.claimedResult===r ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                  {r === 'winner' ? '🏆 I Won' : '😔 I Lost'}
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Remarks (optional)</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Any additional notes..."
              value={submitForm.remarks} onChange={e => setSubmitForm(f=>({...f, remarks:e.target.value}))} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setSubmitModal(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleSubmit}>Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
