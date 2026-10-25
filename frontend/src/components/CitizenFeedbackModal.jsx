import React, { useState } from 'react';
import { store } from '../services/store';
import { Star, CheckCircle, X, RotateCcw } from 'lucide-react';

export const CitizenFeedbackModal = ({ complaint, onClose, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const result = await store.submitFeedback(complaint.complaint_id, rating, feedbackText);
      onSuccess(result.message, result.reopened);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error submitting feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLowRating = rating <= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              Grievance #{complaint.complaint_id}
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1">Rate Resolution & Feedback</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {errorMsg}
            </div>
          )}
          {/* Officer work review */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-400 block font-medium">Resolution Summary by Officer:</span>
            <p className="mt-1 font-semibold text-slate-800">
              {complaint.resolved_notes || 'Work completed on site.'}
            </p>
          </div>

          {/* Star Rating Control */}
          <div className="text-center py-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Satisfaction Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                >
                  <Star
                    className={`w-9 h-9 transition-colors ${
                      star <= (hoverRating ?? rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-800">
              {rating === 1 && '⭐ 1/5 — Severely Unsatisfied'}
              {rating === 2 && '⭐⭐ 2/5 — Incomplete / Poor Resolution'}
              {rating === 3 && '⭐⭐⭐ 3/5 — Acceptable Work'}
              {rating === 4 && '⭐⭐⭐⭐ 4/5 — Good & Timely Resolution'}
              {rating === 5 && '⭐⭐⭐⭐⭐ 5/5 — Excellent Service'}
            </div>
          </div>

          {/* Specification Policy Banner */}
          {isLowRating ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
              <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Automated Reopening Active (Spec F06)</strong>
                Because this rating is 1 or 2 stars, this grievance will return to its assigned officer
                for further work. The previous officer resolution notes and evidence will be preserved in
                the permanent audit trail.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Resolution Acceptance (Spec F06)</strong>
                A rating of 3–5 stars confirms that the issue has been successfully resolved and
                marks the grievance as completed.
              </div>
            </div>
          )}

          {/* Feedback Text Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isLowRating
                ? 'Reason for Dissatisfaction / Unresolved Details *'
                : 'Citizen Comments & Feedback (Optional)'}
            </label>
            <textarea
              required={isLowRating}
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={
                isLowRating
                  ? 'Please explain why the resolution was insufficient...'
                  : 'Share any comments about the officer response and repair speed...'
              }
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              maxLength={1000}
            />
            <span className="text-[10px] text-slate-400 block text-right mt-1">
              Max 1000 characters
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                isLowRating
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isLowRating ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {isLowRating ? 'Submit & Reopen Grievance' : 'Submit & Accept Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
