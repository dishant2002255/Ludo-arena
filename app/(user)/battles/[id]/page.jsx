'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Swords, Users, Trophy, Copy, Check, Camera, XCircle, ShieldAlert, Loader2, Flag } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api/axios';
import useAuthStore from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { connectSocket } from '@/lib/socket/socket';
import { formatDistanceToNow } from 'date-fns';

const C = {
  bg:      '#fdf6e3',
  card:    '#fffdf5',
  border:  '#e8d49a',
  text:    '#3b2800',
  sub:     '#7a5a00',
  muted:   '#a09070',
  gold:    '#c9960a',
  green:   '#0a7a3c',
  greenBg: '#e8f8f0',
  red:     '#dc2626',
  redBg:   '#fee2e2',
  purple:  '#5b21b6',
  purpleBg:'#ede9fe',
};

export default function BattleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [battle, setBattle]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied]   = useState('');
  const [claim, setClaim]     = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchBattle = useCallback(async () => {
    try {
      const { data } = await api.get(`/battles/${id}`);
      setBattle(data.data.battle);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchBattle(); }, [fetchBattle]);

  useEffect(() => {
    if (!battle?._id) return;
    const socket = connectSocket();
    socket.emit('battle:subscribe', { battleId: battle._id });
    const refresh = () => fetchBattle();
    const refreshWallet = () => { fetchBattle(); refreshUser(); };
    socket.on('battle:submission', refresh);
    socket.on('battle:result', refreshWallet);
    socket.on('battle:started', refresh);
    return () => {
      socket.emit('battle:unsubscribe', { battleId: battle._id });
      socket.off('battle:submission', refresh);
      socket.off('battle:result', refreshWallet);
      socket.off('battle:started', refresh);
    };
  }, [battle?._id, fetchBattle, refreshUser]);

  const myId = String(user?._id || '');
  const meIn = (p) => String(typeof p.user === 'object' ? p.user?._id : p.user) === myId;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key); toast.success('Copied!');
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { toast.error('JPG/PNG/WebP only'); return; }
    if (file.size > 8*1024*1024) { toast.error('Max 8 MB'); return; }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submitResult = async () => {
    if (!claim) { toast.error('Select your result first'); return; }
    if (claim === 'won' && !screenshot) { toast.error('Screenshot required for win claim'); return; }
    setSubmitting(true);
    try {
      let screenshotUrl = '';
      if (screenshot) {
        const fd = new FormData();
        fd.append('screenshot', screenshot);
        const up = await api.post(`/battles/${id}/screenshot`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        screenshotUrl = up.data.data.screenshotUrl;
      }
      const { data } = await api.post(`/battles/${id}/submit`, { claim, screenshotUrl, cancelReason });
      toast.success(data.message);
      setClaim(''); setScreenshot(null); setScreenshotPreview(null);
      await refreshUser(); fetchBattle();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const leave = async () => {
    try {
      await api.post(`/battles/${id}/leave`);
      toast.success('Left — entry refunded');
      router.push('/battles');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: C.border, borderTopColor: C.gold }} />
    </div>
  );

  if (notFound || !battle) return (
    <div className="rounded-2xl p-12 text-center" style={{ background: C.card, border: `1.5px solid ${C.border}` }}>
      <Swords size={40} className="mx-auto mb-3" style={{ color: C.muted }} />
      <p style={{ color: C.sub }}>Battle not found</p>
      <Link href="/battles" className="text-sm mt-2 inline-block underline" style={{ color: C.gold }}>Back to lobby</Link>
    </div>
  );

  const statusMap = {
    open:           { label: 'Open',           badge: 'green'  },
    in_progress:    { label: 'In Progress',    badge: 'yellow' },
    result_pending: { label: 'Result Pending', badge: 'yellow' },
    disputed:       { label: 'Disputed',       badge: 'red'    },
    completed:      { label: 'Completed',      badge: 'green'  },
    cancelled:      { label: 'Cancelled',      badge: 'gray'   },
  };
  const st = statusMap[battle.status] || statusMap.open;
  const mySub = battle.participants.find(meIn);
  const amWinner = battle.winner && String(typeof battle.winner === 'object' ? battle.winner._id : battle.winner) === myId;

  return (
    <div className="space-y-4 animate-fade-in pb-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Swords size={20} style={{ color: C.gold }} />
            <h1 className="font-black text-base" style={{ color: C.text }}>{battle.battleCode}</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
            under {battle.subAdmin?.subAdminInfo?.displayName || battle.subAdmin?.username || 'Sub-Admin'}
          </p>
        </div>
        <Badge variant={st.badge}>{st.label}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Entry', value: `₹${battle.entryCoins}`, color: C.gold },
          { label: 'Win Prize', value: `₹${battle.winningPrize}`, color: C.green },
          { label: 'Players', value: `${battle.participants.length}/${battle.maxPlayers}`, color: C.text },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-3 text-center" style={{ background: C.card, border: `1.5px solid ${C.border}` }}>
            <p className="text-[10px] font-semibold mb-1" style={{ color: C.muted }}>{label}</p>
            <p className="font-black text-sm" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Result banners */}
      {battle.status === 'completed' && (
        <div className="rounded-2xl p-5 text-center" style={{ background: C.greenBg, border: `1.5px solid ${C.green}` }}>
          <Trophy size={28} className="mx-auto mb-2" style={{ color: '#e8a800' }} />
          <p className="font-black text-base" style={{ color: C.text }}>
            {amWinner ? '🎉 You Won!' : battle.winner?.username ? `${battle.winner.username} Won!` : 'Completed'}
          </p>
          <p className="text-sm mt-1" style={{ color: C.green }}>Prize: ₹{battle.winningPrize} credited 🏆</p>
        </div>
      )}

      {battle.status === 'cancelled' && (
        <div className="rounded-2xl p-5 text-center" style={{ background: '#f9fafb', border: `1.5px solid #d1d5db` }}>
          <XCircle size={28} className="mx-auto mb-2" style={{ color: '#6b7280' }} />
          <p className="font-semibold text-sm" style={{ color: C.sub }}>Battle cancelled — entries refunded</p>
          {battle.cancelReason && <p className="text-xs mt-1" style={{ color: C.muted }}>{battle.cancelReason}</p>}
        </div>
      )}

      {battle.status === 'disputed' && (
        <div className="rounded-2xl p-4" style={{ background: C.redBg, border: `1.5px solid #fca5a5` }}>
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} style={{ color: C.red }} />
            <div>
              <p className="font-bold text-sm" style={{ color: C.red }}>Result Disputed</p>
              <p className="text-xs mt-1" style={{ color: '#7f1d1d' }}>Sub-Admin will review screenshots and declare winner or refund all.</p>
            </div>
          </div>
        </div>
      )}

      {/* Room credentials */}
      {battle.roomId && ['in_progress','result_pending','disputed','completed'].includes(battle.status) && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: C.greenBg, border: `1.5px solid ${C.border}` }}>
          <p className="font-black text-sm flex items-center gap-2" style={{ color: C.text }}>
            <Swords size={15} style={{ color: C.gold }} /> Ludo King Room Credentials
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div>
                <p className="text-[10px] font-semibold" style={{ color: C.muted }}>Room ID</p>
                <p className="font-black text-sm" style={{ color: C.text }}>{battle.roomId}</p>
              </div>
              <button onClick={() => copy(battle.roomId, 'rid')}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#fff3c4', border: `1px solid ${C.border}` }}>
                {copied === 'rid' ? <Check size={14} style={{ color: C.green }} /> : <Copy size={14} style={{ color: C.gold }} />}
              </button>
            </div>
            {battle.roomPassword && (
              <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: C.muted }}>Password</p>
                  <p className="font-black text-sm" style={{ color: C.text }}>{battle.roomPassword}</p>
                </div>
                <button onClick={() => copy(battle.roomPassword, 'rpwd')}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#fff3c4', border: `1px solid ${C.border}` }}>
                  {copied === 'rpwd' ? <Check size={14} style={{ color: C.green }} /> : <Copy size={14} style={{ color: C.gold }} />}
                </button>
              </div>
            )}
          </div>
          <p className="text-xs" style={{ color: C.muted }}>Ludo King → Private / Local → Enter Room ID to join.</p>
        </div>
      )}

      {/* Participants */}
      <div className="rounded-2xl p-4" style={{ background: C.card, border: `1.5px solid ${C.border}` }}>
        <p className="font-black text-sm mb-3" style={{ color: C.text }}>Participants</p>
        <div className="space-y-2">
          {battle.participants.map((p) => {
            const uid = typeof p.user === 'object' ? String(p.user?._id) : String(p.user);
            const uname = typeof p.user === 'object' ? p.user?.username : 'Player';
            const sub = p.submission || {};
            const isMe = meIn(p);
            const isWinner = battle.winner && String(typeof battle.winner === 'object' ? battle.winner._id : battle.winner) === uid;

            return (
              <div key={uid} className="rounded-xl p-3 flex items-center justify-between"
                style={{
                  background: isMe ? '#f0f4ff' : '#f9f5eb',
                  border: `1.5px solid ${isMe ? '#c4b5fd' : C.border}`,
                }}>
                <div>
                  <p className="font-bold text-sm" style={{ color: C.text }}>
                    {uname}
                    {isMe && <span className="text-xs ml-1 font-semibold" style={{ color: C.purple }}>(you)</span>}
                    {isWinner && <Trophy size={12} className="inline ml-1" style={{ color: '#e8a800' }} />}
                  </p>
                  <p className="text-xs" style={{ color: C.muted }}>
                    Joined {p.joinedAt ? formatDistanceToNow(new Date(p.joinedAt), { addSuffix: true }) : ''}
                  </p>
                </div>
                <div className="text-right">
                  {sub.claim && sub.claim !== 'none' ? (
                    <Badge variant={sub.claim === 'won' ? 'green' : sub.claim === 'lost' ? 'red' : 'gray'}>
                      {sub.claim === 'won' ? '🏆 WIN' : sub.claim === 'lost' ? 'Lost' : 'Cancel'}
                    </Badge>
                  ) : (
                    <span className="text-xs" style={{ color: C.muted }}>awaiting…</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit result */}
      {battle.status === 'in_progress' && mySub && !(mySub.submission?.claim && mySub.submission.claim !== 'none') && (
        <div className="rounded-2xl p-4 space-y-4" style={{ background: C.card, border: `1.5px solid ${C.border}` }}>
          <p className="font-black text-sm flex items-center gap-2" style={{ color: C.text }}>
            <Flag size={15} style={{ color: C.gold }} /> Submit Your Result
          </p>
          <p className="text-xs" style={{ color: C.muted }}>
            Match ke baad apna result submit karo. Sabhi players ke submit karne par result decide hoga. Sab cancel kare toh full refund.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'won',    label: '🏆 I WON',   bg: C.greenBg, border: C.green,  text: C.green },
              { key: 'lost',   label: '😔 I LOST',  bg: C.redBg,   border: '#fca5a5', text: C.red  },
              { key: 'cancel', label: '↩️ Cancel',  bg: '#f9fafb', border: '#d1d5db', text: C.sub  },
            ].map((opt) => (
              <button key={opt.key} onClick={() => setClaim(opt.key)}
                className="py-3 rounded-xl text-xs font-black transition-all"
                style={{
                  background: claim === opt.key ? opt.bg : '#f9f5eb',
                  border: `2px solid ${claim === opt.key ? opt.border : C.border}`,
                  color: claim === opt.key ? opt.text : C.muted,
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {claim === 'won' && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#7a5a00' }}>⚠️ Win claim ke liye screenshot mandatory hai</p>
              {screenshotPreview ? (
                <div className="relative">
                  <img src={screenshotPreview} className="w-full max-h-48 object-contain rounded-xl" alt="result"
                    style={{ border: `1.5px solid ${C.border}` }} />
                  <button onClick={() => { setScreenshot(null); setScreenshotPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                    style={{ background: C.red, color: '#fff' }}>✕</button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl p-5 text-center"
                  style={{ border: `2px dashed ${C.border}`, background: '#f9f5eb' }}>
                  <Camera size={22} className="mx-auto mb-2" style={{ color: C.gold }} />
                  <p className="text-sm font-semibold" style={{ color: C.sub }}>Tap to upload screenshot</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>JPG, PNG, WebP — max 8 MB</p>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleScreenshot} />
            </div>
          )}

          {claim === 'cancel' && (
            <textarea rows={2} className="input-field resize-none" placeholder="Cancellation reason (optional)"
              value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          )}

          <button onClick={submitResult} disabled={submitting || !claim}
            className="w-full py-3.5 rounded-full font-black text-sm active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: 'linear-gradient(to bottom,#f5c842,#c9960a)', color: '#3b2800', boxShadow: '0 3px 10px rgba(201,150,10,0.3)' }}>
            {submitting ? 'Submitting…' : 'Submit Result'}
          </button>
        </div>
      )}

      {/* Open / waiting */}
      {battle.status === 'open' && (
        <div className="rounded-2xl p-6 text-center space-y-3" style={{ background: C.card, border: `1.5px solid ${C.border}` }}>
          <Users size={28} className="mx-auto" style={{ color: C.muted }} />
          <p className="font-semibold text-sm" style={{ color: C.sub }}>
            {battle.maxPlayers - battle.participants.length} more player(s) ka wait…
          </p>
          <p className="text-xs" style={{ color: C.muted }}>Room credentials battle full hone par milenge.</p>
          {mySub && (
            <button onClick={leave}
              className="px-6 py-2 rounded-full text-xs font-bold"
              style={{ background: C.redBg, color: C.red, border: `1px solid #fca5a5` }}>
              ↩️ Leave (refund)
            </button>
          )}
        </div>
      )}

      <Link href="/battles" className="block text-center text-sm pt-2 underline" style={{ color: C.gold }}>
        ← Lobby par wapas jao
      </Link>
    </div>
  );
}
