'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Swords, Users, Coins, Trophy, Copy, Check, Camera, Flag, XCircle, ShieldAlert, Loader2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { connectSocket } from '@/lib/socket/socket';
import { formatDistanceToNow } from 'date-fns';

const STATUS_BADGE = {
  open:           { label: 'Open',           badge: 'green'  },
  in_progress:    { label: 'In Progress',    badge: 'purple' },
  result_pending: { label: 'Result Pending', badge: 'yellow' },
  disputed:       { label: 'Disputed',       badge: 'red'    },
  completed:      { label: 'Completed',      badge: 'blue'   },
  cancelled:      { label: 'Cancelled',      badge: 'gray'   },
};

export default function BattleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [battle, setBattle]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]    = useState(false);
  const [copied, setCopied]        = useState('');
  const [claim, setClaim]          = useState(''); // won | lost | cancel
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchBattle = useCallback(async () => {
    try {
      const { data } = await api.get(`/battles/${id}`);
      setBattle(data.data.battle);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBattle(); }, [fetchBattle]);

  // Subscribe to battle room for live events
  useEffect(() => {
    if (!battle?._id) return;
    const socket = connectSocket();
    socket.emit('battle:subscribe', { battleId: battle._id });
    const onSubmission = () => fetchBattle();
    const onResult = () => { fetchBattle(); refreshUser(); };
    socket.on('battle:submission', onSubmission);
    socket.on('battle:result', onResult);
    socket.on('battle:started', () => fetchBattle());
    return () => {
      socket.emit('battle:unsubscribe', { battleId: battle._id });
      socket.off('battle:submission', onSubmission);
      socket.off('battle:result', onResult);
      socket.off('battle:started', () => fetchBattle());
    };
  }, [battle?._id, fetchBattle, refreshUser]);

  const myId = String(user?._id || '');
  const meIn = (p) => {
    const uid = typeof p.user === 'object' ? String(p.user?._id) : String(p.user);
    return uid === myId;
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success('Copied!');
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG or WebP allowed');
      return;
    }
    if (file.size > 8 * 1024 * 1024) { toast.error('Max 8 MB'); return; }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submitResult = async () => {
    if (!claim) { toast.error('Select your result first'); return; }
    if (claim === 'won' && !screenshot) {
      toast.error('Win claim requires a screenshot');
      return;
    }
    setSubmitting(true);
    try {
      let screenshotUrl = '';
      if (screenshot) {
        const fd = new FormData();
        fd.append('screenshot', screenshot);
        const up = await api.post(`/battles/${id}/screenshot`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        screenshotUrl = up.data.data.screenshotUrl;
      }
      const { data } = await api.post(`/battles/${id}/submit`, {
        claim,
        screenshotUrl,
        cancelReason,
      });
      toast.success(data.message);
      setClaim('');
      setScreenshot(null);
      setScreenshotPreview(null);
      await refreshUser();
      fetchBattle();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit result');
    } finally {
      setSubmitting(false);
    }
  };

  const leave = async () => {
    try {
      await api.post(`/battles/${id}/leave`);
      toast.success('Left battle — entry refunded');
      router.push('/battles');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={32} className="animate-spin text-purple-400" />
    </div>
  );
  if (notFound || !battle) return (
    <div className="game-card p-12 text-center">
      <Swords size={40} className="mx-auto mb-3 text-slate-600" />
      <p className="text-slate-400">Battle not found</p>
      <Link href="/battles" className="text-purple-400 underline text-sm mt-2 inline-block">Back to lobby</Link>
    </div>
  );

  const st = STATUS_BADGE[battle.status] || STATUS_BADGE.open;
  const mySub = battle.participants.find(meIn);
  const amWinner = battle.winner && String(typeof battle.winner === 'object' ? battle.winner._id : battle.winner) === myId;
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <Swords size={24} className="text-purple-400" /> {battle.battleCode}
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            under {battle.subAdmin?.subAdminInfo?.displayName || 'Sub-Admin'}
          </p>
        </div>
        <Badge variant={st.badge}>{st.label}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="game-card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Entry</p>
          <p className="text-yellow-400 font-bold flex items-center justify-center gap-1"><Coins size={14} />{battle.entryCoins}</p>
        </div>
        <div className="game-card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Winner prize</p>
          <p className="text-emerald-400 font-bold">{battle.winningPrize}</p>
        </div>
        <div className="game-card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Players</p>
          <p className="text-white font-bold flex items-center justify-center gap-1"><Users size={14} />{battle.participants.length}/{battle.maxPlayers}</p>
        </div>
      </div>

      {/* Result banner */}
      {battle.status === 'completed' && (
        <div className={`game-card p-5 text-center ${amWinner ? 'border-emerald-500/40' : ''}`}>
          <Trophy size={28} className="mx-auto mb-2 text-amber-400" />
          <p className="text-white font-bold">
            {amWinner ? 'You won! 🎉' : battle.winner?.username ? `${battle.winner.username} won` : 'Completed'}
          </p>
          <p className="text-emerald-400 text-sm">Prize: {battle.winningPrize} coins</p>
        </div>
      )}
      {battle.status === 'cancelled' && (
        <div className="game-card p-5 text-center border-white/10">
          <XCircle size={28} className="mx-auto mb-2 text-slate-500" />
          <p className="text-slate-300 font-semibold">Battle cancelled — all entries refunded</p>
          {battle.cancelReason && <p className="text-xs text-slate-500 mt-1">{battle.cancelReason}</p>}
        </div>
      )}
      {battle.status === 'disputed' && (
        <div className="game-card p-5 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-red-400 mt-0.5" />
            <div>
              <p className="text-red-300 font-semibold">Result disputed</p>
              <p className="text-xs text-red-400/70 mt-1">
                Claims conflict. The Sub-Admin will review the screenshots and declare the winner or refund everyone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Room credentials — visible to participants once full */}
      {battle.roomId && ['in_progress', 'result_pending', 'disputed', 'completed'].includes(battle.status) && (
        <div className="game-card p-5 space-y-3">
          <p className="text-white font-semibold flex items-center gap-2"><Swords size={16} /> Ludo King Room</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Room ID</p>
                <p className="text-white font-mono font-bold">{battle.roomId}</p>
              </div>
              <button onClick={() => copy(battle.roomId, 'rid')}
                className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400">
                {copied === 'rid' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            {battle.roomPassword && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Password</p>
                  <p className="text-white font-mono font-bold">{battle.roomPassword}</p>
                </div>
                <button onClick={() => copy(battle.roomPassword, 'rpwd')}
                  className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  {copied === 'rpwd' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">Open Ludo King → Private / Local → enter this Room ID to join the table.</p>
        </div>
      )}

      {/* Participants */}
      <div className="game-card p-5">
        <p className="text-white font-semibold mb-3">Participants & claims</p>
        <div className="space-y-2">
          {battle.participants.map((p, i) => {
            const uid = typeof p.user === 'object' ? String(p.user?._id) : String(p.user);
            const uname = typeof p.user === 'object' ? p.user?.username : 'Player';
            const sub = p.submission || {};
            const isMe = meIn(p);
            const isWinner = battle.winner && (typeof battle.winner === 'object' ? String(battle.winner._id) : String(battle.winner)) === uid;
            return (
              <div key={uid} className={`p-3 rounded-xl border flex items-center justify-between gap-3
                ${isMe ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/10 bg-white/5'}`}>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {uname} {isMe && <span className="text-xs text-purple-400">(you)</span>}
                    {isWinner && <Trophy size={14} className="inline ml-1 text-amber-400" />}
                  </p>
                  <p className="text-xs text-slate-500">
                    Joined {p.joinedAt ? formatDistanceToNow(new Date(p.joinedAt), { addSuffix: true }) : ''}
                  </p>
                </div>
                <div className="text-right">
                  {sub.claim && sub.claim !== 'none' ? (
                    <>
                      <Badge variant={sub.claim === 'won' ? 'green' : sub.claim === 'lost' ? 'red' : 'gray'}>
                        {sub.claim === 'won' ? 'Claims WIN' : sub.claim === 'lost' ? 'Lost' : 'Cancel'}
                      </Badge>
                      {sub.screenshotUrl && (
                        <a href={sub.screenshotUrl} target="_blank" rel="noreferrer" className="block text-xs text-purple-400 mt-1 hover:underline">
                          view screenshot
                        </a>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-slate-600">awaiting…</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit result (participants, in progress) */}
      {battle.status === 'in_progress' && mySub && !(mySub.submission?.claim && mySub.submission.claim !== 'none') && (
        <div className="game-card p-5 space-y-4">
          <p className="text-white font-semibold flex items-center gap-2"><Flag size={16} /> Submit your result</p>
          <p className="text-xs text-slate-400">
            After the Ludo King match ends, claim your result. Everyone must submit before the battle resolves.
            If all players claim cancel, everyone gets a full refund.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'won',   label: 'I WON',   icon: <Trophy size={16} />, cls: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
              { key: 'lost',  label: 'I LOST',  icon: <XCircle size={16} />, cls: 'bg-red-500/20 border-red-500/40 text-red-300' },
              { key: 'cancel', label: 'CANCEL',  icon: <XCircle size={16} />, cls: 'bg-white/10 border-white/20 text-slate-300' },
            ].map((opt) => (
              <button key={opt.key} onClick={() => setClaim(opt.key)}
                className={`py-3 rounded-xl text-sm font-bold border transition-all flex flex-col items-center gap-1
                  ${claim === opt.key ? opt.cls : 'bg-white/5 border-white/10 text-slate-400'}`}>
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>

          {claim === 'won' && (
            <div className="space-y-2">
              <p className="text-xs text-amber-400">Win claim requires the end-game screenshot</p>
              {screenshotPreview ? (
                <div className="relative">
                  <img src={screenshotPreview} className="w-full max-h-48 object-contain rounded-xl border border-white/10" alt="result" />
                  <button onClick={() => { setScreenshot(null); setScreenshotPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white text-xs">✕</button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-purple-500/30 rounded-xl p-6 text-center hover:border-purple-500/60">
                  <Camera size={20} className="mx-auto mb-2 text-purple-400" />
                  <p className="text-slate-300 text-sm">Upload result screenshot</p>
                  <p className="text-slate-500 text-xs mt-1">JPG, PNG, WebP — max 8 MB</p>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleScreenshot} />
            </div>
          )}

          {claim === 'cancel' && (
            <textarea
              className="input-field resize-none" rows={2}
              placeholder="Reason for cancelling (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          )}

          <Button fullWidth loading={submitting} disabled={!claim} onClick={submitResult}>
            Submit Result
          </Button>
        </div>
      )}

      {/* Waiting / open state */}
      {battle.status === 'open' && (
        <div className="game-card p-6 text-center space-y-3">
          <Users size={28} className="mx-auto text-slate-500" />
          <p className="text-slate-300">Waiting for {battle.maxPlayers - battle.participants.length} more player(s)…</p>
          <p className="text-xs text-slate-500">Room credentials appear here once the battle fills.</p>
          {mySub && (
            <Button variant="secondary" onClick={leave} size="sm"><XCircle size={14} /> Leave (refund)</Button>
          )}
        </div>
      )}

      <Link href="/battles" className="block text-center text-sm text-slate-400 hover:text-purple-400 pt-2">
        ← Back to lobby
      </Link>
    </div>
  );
}
