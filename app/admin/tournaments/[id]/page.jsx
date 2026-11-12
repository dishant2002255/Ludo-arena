'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Trophy, Users, Edit2, XCircle, Eye, EyeOff,
  CheckCircle, AlertTriangle, RefreshCw, ExternalLink
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import api from '@/lib/api/axios';
import { toast } from '@/store/toastStore';
import { format } from 'date-fns';
import Link from 'next/link';

const STATUS_BADGE = {
  submitted:'yellow', verification_pending:'blue',
  approved:'green', rejected:'red', resubmission_required:'yellow',
};

export default function AdminTournamentDetailPage() {
  const { id }   = useParams();
  const router   = useRouter();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading]       = useState(true);

  // Modals
  const [editModal, setEditModal]       = useState(false);
  const [roomModal, setRoomModal]       = useState(false);
  const [verifyModal, setVerifyModal]   = useState(null); // { submission }
  const [finalModal, setFinalModal]     = useState(false);
  const [cancelModal, setCancelModal]   = useState(false);
  const [regModal, setRegModal]         = useState(false);

  // Form states
  const [editForm, setEditForm]         = useState({});
  const [bannerFile, setBannerFile]     = useState(null);
  const [roomForm, setRoomForm]         = useState({ externalPlatform:'Ludo King', externalRoomId:'', externalRoomPassword:'', roomInstructions:'', roomNotes:'' });
  const [verifyForm, setVerifyForm]     = useState({ status:'approved', adminRemarks:'' });
  const [finalForm, setFinalForm]       = useState({ winnerUserId:'', verificationRemarks:'' });
  const [cancelForm, setCancelForm]     = useState({ reason:'' });
  const [showPass, setShowPass]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => { fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/tournaments/admin/${id}/detail`);
      setTournament(data.data.tournament);
      setEditForm({ title: data.data.tournament.title, description: data.data.tournament.description, rules: data.data.tournament.rules, winnerReward: data.data.tournament.winnerReward });
      setRoomForm({
        externalPlatform: data.data.tournament.externalPlatform || 'Ludo King',
        externalRoomId: data.data.tournament.externalRoomId || '',
        externalRoomPassword: data.data.tournament.externalRoomPassword || '',
        roomInstructions: data.data.tournament.roomInstructions || '',
        roomNotes: data.data.tournament.roomNotes || '',
      });
    } catch (err) {
      toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const act = async (fn, successMsg) => {
    setSubmitting(true);
    try {
      await fn();
      toast.success(successMsg);
      await fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => act(async () => {
    const fd = new FormData();
    Object.entries(editForm).forEach(([k,v]) => fd.append(k, v));
    if (bannerFile) fd.append('banner', bannerFile);
    await api.patch(`/tournaments/admin/${id}`, fd, { headers:{'Content-Type':'multipart/form-data'} });
    setEditModal(false);
  }, 'Tournament updated');

  const handleToggleReg = (open) => act(async () => {
    await api.patch(`/tournaments/admin/${id}/toggle-registration`, { open });
    setRegModal(false);
  }, `Registration ${open ? 'opened' : 'closed'}`);

  const handlePublishRoom = () => act(async () => {
    await api.post(`/tournaments/admin/${id}/publish-room`, roomForm);
    setRoomModal(false);
  }, 'Room details published!');

  const handleVerify = () => act(async () => {
    await api.patch(`/tournaments/admin/${id}/verify`, {
      submissionId: verifyModal.submission._id,
      status: verifyForm.status,
      adminRemarks: verifyForm.adminRemarks,
    });
    setVerifyModal(null);
  }, 'Submission updated');

  const handleFinalize = () => act(async () => {
    await api.patch(`/tournaments/admin/${id}/finalize`, finalForm);
    setFinalModal(false);
  }, 'Tournament finalized!');

  const handleCancel = () => act(async () => {
    await api.patch(`/tournaments/admin/${id}/cancel`, { reason: cancelForm.reason });
    setCancelModal(false);
  }, 'Tournament cancelled');

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0,1].map(i=><Skeleton key={i} className="h-64 rounded-xl"/>)}
      </div>
    </div>
  );
  if (!tournament) return <div className="text-slate-400 p-8 text-center">Not found</div>;

  const t = tournament;
  const isFull        = t.participants?.length >= t.requiredPlayers;
  const isActive      = !['completed','cancelled'].includes(t.status);
  const canPublishRoom = t.status === 'waiting_for_admin';
  const canFinalize   = t.status === 'result_pending';
  const canCancel     = isActive;
  const canEditRoom   = ['waiting_for_admin','room_published','result_pending'].includes(t.status);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/tournaments">
            <button className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all">
              <ChevronLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white font-display line-clamp-1">{t.title}</h1>
            <p className="text-slate-400 text-sm capitalize">{t.status?.replace(/_/g,' ')}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14}/>} onClick={fetchDetail}>Refresh</Button>
          {isActive && <Button variant="secondary" size="sm" icon={<Edit2 size={14}/>} onClick={() => setEditModal(true)}>Edit</Button>}
          {isActive && (
            <Button variant="secondary" size="sm" onClick={() => setRegModal(true)}>
              {t.registrationOpen ? 'Close Registration' : 'Open Registration'}
            </Button>
          )}
          {canEditRoom && (
            <Button size="sm" onClick={() => setRoomModal(true)}>
              {t.externalRoomId ? 'Update Room' : 'Publish Room'}
            </Button>
          )}
          {canFinalize && (
            <Button variant="success" size="sm" onClick={() => setFinalModal(true)}>Finalize & Announce</Button>
          )}
          {canCancel && (
            <Button variant="danger" size="sm" icon={<XCircle size={14}/>} onClick={() => setCancelModal(true)}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info + Participants */}
        <div className="space-y-5">
          {/* Banner */}
          {t.bannerUrl && (
            <div className="game-card overflow-hidden h-40">
              <img src={t.bannerUrl} alt={t.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Stats */}
          <div className="game-card p-5 grid grid-cols-2 gap-4">
            {[
              ['Status', t.status?.replace(/_/g,' ')],
              ['Reward', t.winnerReward > 0 ? `${t.winnerReward} coins` : 'None'],
              ['Platform', t.externalPlatform || '—'],
              ['Registration', t.registrationOpen ? 'Open' : 'Closed'],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="text-sm text-white font-medium capitalize">{val}</p>
              </div>
            ))}
          </div>

          {/* Participants */}
          <div className="game-card p-5">
            <h2 className="section-title mb-4">Participants ({t.participants?.length||0}/{t.requiredPlayers})</h2>
            {(t.participants?.length||0) === 0 ? (
              <p className="text-slate-500 text-sm">No participants yet</p>
            ) : (
              <div className="space-y-2">
                {t.participants.map((p, i) => (
                  <div key={p._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <Avatar username={p.user?.username} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.user?.username}</p>
                      <p className="text-xs text-slate-500 truncate">{p.user?.email}</p>
                    </div>
                    {t.verifiedWinner && p.user?._id === (t.verifiedWinner?._id || t.verifiedWinner) && (
                      <span className="text-yellow-400 text-xs font-semibold">🏆 Winner</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Room Credentials (admin view) */}
          {t.externalRoomId && (
            <div className="game-card p-5 space-y-3">
              <h2 className="section-title">Published Room</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Platform</p><p className="text-white">{t.externalPlatform}</p></div>
                <div><p className="text-xs text-slate-500">Room ID</p><code className="text-purple-300 font-mono">{t.externalRoomId}</code></div>
                {t.externalRoomPassword && (
                  <div>
                    <p className="text-xs text-slate-500">Password</p>
                    <div className="flex items-center gap-1.5">
                      <code className="text-purple-300 font-mono">{showPass ? t.externalRoomPassword : '••••••'}</code>
                      <button onClick={()=>setShowPass(v=>!v)} className="text-slate-500 hover:text-white">
                        {showPass ? <EyeOff size={12}/> : <Eye size={12}/>}
                      </button>
                    </div>
                  </div>
                )}
                {t.roomPublishedAt && (
                  <div><p className="text-xs text-slate-500">Published</p><p className="text-white text-xs">{format(new Date(t.roomPublishedAt),'dd MMM yy HH:mm')}</p></div>
                )}
              </div>
              {t.roomInstructions && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-slate-500 mb-1">Instructions</p>
                  <p className="text-sm text-slate-300">{t.roomInstructions}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submissions */}
        <div className="game-card p-5 space-y-4">
          <h2 className="section-title">Result Submissions ({t.submissions?.length||0})</h2>
          {(t.submissions?.length||0) === 0 ? (
            <p className="text-slate-500 text-sm">No submissions yet</p>
          ) : (
            <div className="space-y-4">
              {t.submissions.map((sub) => (
                <div key={sub._id} className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Avatar username={sub.user?.username} size="xs" />
                      <div>
                        <p className="text-white text-sm font-medium">{sub.user?.username}</p>
                        <p className="text-xs text-slate-500">Claimed: <span className="capitalize text-white">{sub.claimedResult}</span></p>
                      </div>
                    </div>
                    <span className={`badge badge-${STATUS_BADGE[sub.status]||'gray'} capitalize`}>
                      {sub.status?.replace(/_/g,' ')}
                    </span>
                  </div>
                  {/* Screenshot */}
                  <div>
                    <a href={sub.screenshotUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                      <ExternalLink size={11} /> View Screenshot
                    </a>
                    <img src={sub.screenshotUrl} alt="result" className="mt-2 w-full max-h-32 object-contain rounded-lg border border-white/10" />
                  </div>
                  {sub.remarks && <p className="text-xs text-slate-400 italic">{sub.remarks}</p>}
                  {sub.adminRemarks && <p className="text-xs text-slate-500 border-t border-white/10 pt-2">Admin note: {sub.adminRemarks}</p>}
                  {/* Verify button */}
                  {['submitted','verification_pending'].includes(sub.status) && (
                    <Button size="sm" variant="secondary" fullWidth onClick={() => {
                      setVerifyModal({ submission: sub });
                      setVerifyForm({ status:'approved', adminRemarks:'' });
                    }}>Review Submission</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Edit */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Tournament">
        <div className="p-6 space-y-4">
          <Input label="Title" value={editForm.title||''} onChange={e=>setEditForm({...editForm,title:e.target.value})} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea className="input-field resize-none" rows={3} value={editForm.description||''} onChange={e=>setEditForm({...editForm,description:e.target.value})} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Rules</label>
            <textarea className="input-field resize-none" rows={4} value={editForm.rules||''} onChange={e=>setEditForm({...editForm,rules:e.target.value})} />
          </div>
          <Input label="Winner Reward (coins)" type="number" min={0} value={editForm.winnerReward||0} onChange={e=>setEditForm({...editForm,winnerReward:parseInt(e.target.value)||0})} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Replace Banner (optional)</label>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" className="input-field py-2" onChange={e=>setBannerFile(e.target.files[0]||null)} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Toggle registration */}
      <Modal isOpen={regModal} onClose={() => setRegModal(false)} title="Registration" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm">
            {t.registrationOpen
              ? 'Close registration so no new players can join?'
              : 'Open registration so players can join this tournament?'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRegModal(false)}>Cancel</Button>
            <Button loading={submitting} variant={t.registrationOpen ? 'danger' : 'success'}
              onClick={() => handleToggleReg(!t.registrationOpen)}>
              {t.registrationOpen ? 'Close Registration' : 'Open Registration'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Publish room */}
      <Modal isOpen={roomModal} onClose={() => setRoomModal(false)} title={t.externalRoomId ? 'Update Room Details' : 'Publish Room Details'}>
        <div className="p-6 space-y-4">
          <Input label="Platform" value={roomForm.externalPlatform} onChange={e=>setRoomForm({...roomForm,externalPlatform:e.target.value})} />
          <Input label="Room ID *" value={roomForm.externalRoomId} onChange={e=>setRoomForm({...roomForm,externalRoomId:e.target.value})} placeholder="e.g. 123456" />
          <Input label="Room Password (optional)" value={roomForm.externalRoomPassword} onChange={e=>setRoomForm({...roomForm,externalRoomPassword:e.target.value})} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Instructions for players</label>
            <textarea className="input-field resize-none" rows={3} placeholder="How to find and join the room..."
              value={roomForm.roomInstructions} onChange={e=>setRoomForm({...roomForm,roomInstructions:e.target.value})} />
          </div>
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
            ⚠ Room credentials will be visible ONLY to the 4 registered participants.
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRoomModal(false)}>Cancel</Button>
            <Button loading={submitting} variant="success" onClick={handlePublishRoom}>Publish Room</Button>
          </div>
        </div>
      </Modal>

      {/* Verify submission */}
      <Modal isOpen={!!verifyModal} onClose={() => setVerifyModal(null)} title="Verify Submission" size="sm">
        {verifyModal && (
          <div className="p-6 space-y-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm space-y-1">
              <p className="text-white font-medium">{verifyModal.submission.user?.username}</p>
              <p className="text-slate-400 capitalize">Claimed: {verifyModal.submission.claimedResult}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Decision</label>
              <div className="grid grid-cols-3 gap-2">
                {['approved','rejected','resubmission_required'].map(s => (
                  <button key={s} onClick={() => setVerifyForm(f=>({...f,status:s}))}
                    className={`p-2 rounded-xl border text-xs font-medium capitalize transition-all
                      ${verifyForm.status===s ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                    {s.replace(/_/g,' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Admin Remarks</label>
              <textarea className="input-field resize-none" rows={2} placeholder="Feedback for the user..."
                value={verifyForm.adminRemarks} onChange={e=>setVerifyForm(f=>({...f,adminRemarks:e.target.value}))} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setVerifyModal(null)}>Cancel</Button>
              <Button loading={submitting} onClick={handleVerify}>Submit Decision</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Finalize */}
      <Modal isOpen={finalModal} onClose={() => setFinalModal(false)} title="Finalize Tournament" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm">Select the winner and finalize the tournament. This action credits the reward and cannot be undone.</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Winner</label>
            <select className="input-field" value={finalForm.winnerUserId}
              onChange={e=>setFinalForm(f=>({...f,winnerUserId:e.target.value}))}>
              <option value="">Select winner...</option>
              {t.participants?.map(p => (
                <option key={p.user._id} value={p.user._id}>{p.user.username}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Verification Remarks</label>
            <textarea className="input-field resize-none" rows={2}
              value={finalForm.verificationRemarks} onChange={e=>setFinalForm(f=>({...f,verificationRemarks:e.target.value}))} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setFinalModal(false)}>Cancel</Button>
            <Button loading={submitting} variant="success" onClick={handleFinalize}>Finalize Tournament</Button>
          </div>
        </div>
      </Modal>

      {/* Cancel */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Tournament" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-red-400 text-sm">This will cancel the tournament and notify all participants.</p>
          <Input label="Reason (optional)" value={cancelForm.reason} onChange={e=>setCancelForm({reason:e.target.value})} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCancelModal(false)}>Back</Button>
            <Button loading={submitting} variant="danger" onClick={handleCancel}>Confirm Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
