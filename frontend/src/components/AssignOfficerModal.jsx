import React, { useState } from 'react';
import { store } from '../services/store';
import { X, UserCheck, AlertCircle } from 'lucide-react';

export const AssignOfficerModal = ({ complaint, onClose, onSuccess }) => {
  const departments = store.getDepartments();

  const matchedDept = departments.find(
    (d) => d.name.toLowerCase() === complaint.category.toLowerCase()
  );
  const users = store
    .getUsers()
    .filter(
      (u) =>
        u.role === 'OFFICER' &&
        Boolean(u.active) &&
        Boolean(u.verified) &&
        matchedDept &&
        Number(u.department_id) === Number(matchedDept.department_id)
    );

  const [selectedOfficerId, setSelectedOfficerId] = useState(
    users[0]?.user_id || ''
  );
  const [priority, setPriority] = useState(complaint.priority || 'HIGH');

  const defaultDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const [deadline, setDeadline] = useState(complaint.deadline || defaultDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedOfficerId) {
      setErrorMsg('Please select an active department officer.');
      return;
    }
    if (!deadline) {
      setErrorMsg('Please specify a target resolution deadline.');
      return;
    }

    try {
      setIsSubmitting(true);
      await store.assignComplaint(complaint.complaint_id, selectedOfficerId, priority, deadline);
      onSuccess(`Complaint #${complaint.complaint_id} assigned to officer with ${priority} priority.`);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign officer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-purple-50">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-700">
              Administrative Triage & Workload Dispatch
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">Assign Department Officer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAssign} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Grievance Context */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-900">
              #{complaint.complaint_id} — {complaint.title}
            </div>
            <div className="text-slate-500">
              Category: <span className="font-medium text-slate-800">{complaint.category}</span>
            </div>
            <div className="text-slate-500">
              Location: <span className="font-medium text-slate-800">{complaint.location}</span>
            </div>
          </div>

          {/* Officer Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Qualified Officer *
            </label>
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(Number(e.target.value))}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden cursor-pointer"
            >
              {users.map((officer) => (
                <option key={officer.user_id} value={officer.user_id}>
                  {officer.name} ({officer.department_name || 'General Field Unit'})
                </option>
              ))}
            </select>
            {matchedDept ? (
              <span className="text-[10px] text-purple-600 font-medium mt-1 block">
                Suggested department match: {matchedDept.name}
              </span>
            ) : (
              <span role="alert" className="mt-1 block text-[10px] text-rose-700">
                This grievance category has no configured department. Configure the department catalog before assigning it.
              </span>
            )}
            {matchedDept && users.length === 0 && (
              <span role="alert" className="mt-1 block text-[10px] text-rose-700">
                No active officers are assigned to this department.
              </span>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Municipal Triage Priority Level *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['LOW', 'MEDIUM', 'HIGH'].map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setPriority(lvl)}
                  className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    priority === lvl
                      ? lvl === 'HIGH'
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : lvl === 'MEDIUM'
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Resolution Target Deadline (YYYY-MM-DD) *
            </label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Admin-enforced service level agreement deadline.
            </span>
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
              disabled={isSubmitting || users.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
