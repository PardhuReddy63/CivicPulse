import React, { useEffect, useState } from 'react';
import { ProtectedEvidenceImage } from './ProtectedEvidenceImage';
import {
  X,
  Calendar,
  MapPin,
  User,
  ArrowRight,
  Star,
  CheckCircle,
} from 'lucide-react';

export const TimelineModal = ({
  complaint,
  history = [],
  feedbacks = [],
  verifications = [],
  onClose,
  onOpenFeedback,
  onResolve,
  onAssign,
  onReviewResolution,
  isReviewingResolution = false,
  canViewResolutionEvidence = true,
  canRate = false,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  useEffect(() => {
    setRejectionReason('');
    setRejecting(false);
  }, [complaint?.complaint_id, complaint?.resolution_cycle, complaint?.status]);
  if (!complaint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                Ticket #{complaint.complaint_id}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  complaint.status === 'RESOLVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : ['ASSIGNED', 'RESOLUTION_REJECTED'].includes(complaint.status)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {complaint.status}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                Cycle #{complaint.resolution_cycle}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">{complaint.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Category</span>
              <span className="font-semibold text-slate-800">{complaint.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Priority</span>
              <span className="font-semibold text-slate-800">{complaint.priority}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Citizen Owner</span>
              <span className="font-semibold text-slate-800">{complaint.citizen_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Assigned Officer</span>
              <span className="font-semibold text-slate-800">
                {complaint.officer_name || 'Unassigned'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block font-medium">Location</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                {complaint.location}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block font-medium">Target Deadline</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                {complaint.deadline || 'Pending admin deadline assignment'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1.5">
              Citizen Grievance Description
            </h3>
            <p className="text-sm text-slate-700 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              {complaint.description}
            </p>
          </div>

          {/* Photo Evidence Side-by-Side (Before & After) */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
              Evidence Photographic Record
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Photo */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                <div className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between border-b border-slate-200">
                  <span>BEFORE EVIDENCE</span>
                  <span className="text-[10px] text-slate-500">Submitted by Citizen</span>
                </div>
                <div className="h-44 w-full flex items-center justify-center bg-slate-200">
                  {complaint.image ? (
                    <ProtectedEvidenceImage
                      complaintId={complaint.complaint_id}
                      type="BEFORE"
                      alt="Before proof"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">No before-photo uploaded</span>
                  )}
                </div>
              </div>

              {/* After Photo */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-between border-b border-emerald-200">
                  <span>AFTER RESOLUTION PROOF</span>
                  <span className="text-[10px] text-emerald-700">Submitted by Officer</span>
                </div>
                <div className="h-44 w-full flex items-center justify-center bg-slate-200">
                  {!canViewResolutionEvidence ? (
                    <span className="px-4 text-center text-xs text-slate-500">
                      Resolution evidence will be available after administrator approval.
                    </span>
                  ) : complaint.resolved_image ? (
                    <ProtectedEvidenceImage
                      complaintId={complaint.complaint_id}
                      type="AFTER"
                      alt="After proof"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">
                      {complaint.status === 'RESOLVED'
                        ? 'Resolution photo logged'
                        : 'Awaiting officer resolution proof'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Officer Resolution Notes */}
          {canViewResolutionEvidence && complaint.resolved_notes && (
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Officer Work Summary (Resolved by {complaint.resolved_by_name || 'Officer'})
              </div>
              <p className="text-xs text-emerald-950 leading-relaxed font-sans">
                {complaint.resolved_notes}
              </p>
              {complaint.resolved_at && (
                <div className="text-[11px] text-emerald-700 mt-2 font-mono">
                  Timestamp: {new Date(complaint.resolved_at).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {verifications.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Citizen resolution verification
              </h3>
              <div className="space-y-2">
                {verifications.map((verification) => (
                  <div
                    key={verification.verification_id}
                    className={`rounded-xl border p-3 text-xs ${
                      verification.decision === 'RESOLVED'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                        : 'border-amber-200 bg-amber-50 text-amber-950'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{verification.decision === 'RESOLVED' ? 'Yes, resolved' : 'No, not resolved'}</strong>
                      <span className="text-[10px] text-slate-500">
                        Cycle #{verification.resolution_cycle} · {verification.citizen_name} · {verification.created_at}
                      </span>
                    </div>
                    {verification.feedback_text && (
                      <p className="mt-1">{verification.feedback_text}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {complaint.status === 'RESOLUTION_PENDING_REVIEW' && onReviewResolution && (
            <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-xs font-bold text-amber-900">Administrator resolution review</h3>
              <p className="text-xs text-amber-800">
                Approve this evidence to request citizen verification, or reject it with actionable feedback for the assigned officer.
              </p>
              {rejecting && (
                <label className="block text-xs font-semibold text-slate-700">
                  Rejection reason *
                  <textarea
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    maxLength={500}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-xs"
                    placeholder="Explain what additional work or evidence is required."
                  />
                </label>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {rejecting ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejecting(false)}
                      className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isReviewingResolution || !rejectionReason.trim()}
                      onClick={() => onReviewResolution('REJECT', rejectionReason.trim())}
                      className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {isReviewingResolution ? 'Saving...' : 'Reject evidence'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejecting(true)}
                      className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={isReviewingResolution}
                      onClick={() => onReviewResolution('APPROVE', '')}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {isReviewingResolution ? 'Saving...' : 'Approve for citizen verification'}
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Feedback & Ratings Record */}
          {feedbacks.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                Citizen Feedback History ({feedbacks.length} reviews)
              </h3>
              <div className="space-y-2">
                {feedbacks.map((f) => (
                  <div
                    key={f.feedback_id}
                    className={`p-3 rounded-xl border text-xs ${
                      f.rating <= 2
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 font-bold">
                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= f.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-1">
                          {f.rating}/5 —{' '}
                          {f.rating <= 2 ? 'Disputed / Reopened' : 'Resolution Accepted'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Resolution Cycle #{f.resolution_cycle}
                      </span>
                    </div>
                    {f.feedback_text && <p className="mt-1 text-slate-700">{f.feedback_text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chronological Status Audit Timeline */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
              Chronological Status History & Audit Trail
            </h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {history.map((h, idx) => (
                <div key={h.history_id || idx} className="relative group">
                  <div className="absolute -left-6 mt-1 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span>{h.old_status || 'CREATED'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            h.new_status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : h.new_status === 'ASSIGNED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {h.new_status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                    {h.reason && (
                      <p className="mt-1 text-slate-600 text-xs italic">"{h.reason}"</p>
                    )}
                    <div className="mt-1.5 text-[10px] text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{h.changed_by_name}</span>
                      <span className="px-1 rounded bg-slate-200 text-slate-600 font-semibold uppercase text-[9px]">
                        {h.changed_by_role}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            CivicPulse Audit Record • Immutable History Log
          </div>
          <div className="flex items-center gap-2">
            {canRate && complaint.status === 'RESOLVED' && onOpenFeedback && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFeedback(complaint);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-white" />
                Rate Resolution Outcome
              </button>
            )}
            {complaint.status === 'ASSIGNED' && onResolve && (
              <button
                onClick={onResolve}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
              >
                Submit resolution
              </button>
            )}
            {onAssign && (
              <button
                onClick={onAssign}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition"
              >
                Assign officer
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
