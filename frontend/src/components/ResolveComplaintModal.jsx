import React, { useState } from 'react';
import { store } from '../services/store';
import { X, CheckCircle, Upload, AlertCircle, Camera } from 'lucide-react';

export const ResolveComplaintModal = ({ complaint, onClose, onSuccess }) => {
  const [resolvedNotes, setResolvedNotes] = useState('');
  const [afterImagePreview, setAfterImagePreview] = useState(null);
  const [afterImageFile, setAfterImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Proof photo exceeds 5 MB size limit.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Only JPEG, PNG, or WebP files are supported.');
      return;
    }

    setErrorMsg(null);
    setAfterImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAfterImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolvedNotes.trim()) {
      setErrorMsg('Resolution summary describing physical field remediation is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await store.resolveComplaint(complaint.complaint_id, resolvedNotes.trim(), afterImageFile);
      onSuccess(`Complaint #${complaint.complaint_id} marked as RESOLVED. Citizen has been invited to rate.`);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record resolution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-emerald-50">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700">
              Officer Work Order Remediation
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Submit Grievance Resolution Proof
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleResolve} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ticket context preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-900">
              #{complaint.complaint_id} — {complaint.title}
            </div>
            <div className="text-slate-500">{complaint.location}</div>
          </div>

          {/* Resolution Summary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Field Action Summary / Technical Notes *
            </label>
            <textarea
              required
              rows={4}
              value={resolvedNotes}
              onChange={(e) => setResolvedNotes(e.target.value)}
              placeholder="Describe remedial measures taken (e.g. Asphalting completed with cold-mix bitumen, pressure test completed, cleaned 4 metric tons debris)..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* After Photo Proof Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              After Photographic Evidence Proof (Max 5 MB)
            </label>
            <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl p-4 text-center bg-emerald-50/30 transition">
              {afterImagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={afterImagePreview}
                    alt="After resolution proof"
                    className="h-36 rounded-lg object-cover shadow-sm mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAfterImagePreview(null);
                      setAfterImageFile(null);
                    }}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-full text-xs shadow-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Camera className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
                  <span className="text-xs font-semibold text-emerald-700 hover:underline block">
                    Upload completion proof photo
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Required for high-scrutiny categories (Roads, Water, Sanitation)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <strong>Citizen Review Guarantee:</strong> The citizen owner will review this outcome.
            If the citizen awards 1 or 2 stars, this ticket will be automatically reopened to
            PENDING.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {isSubmitting ? 'Recording...' : 'Mark as RESOLVED'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
