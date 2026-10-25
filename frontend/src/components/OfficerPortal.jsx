import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { store } from '../services/store';
import { GrievanceMap } from './GrievanceMap';
import { ResolveComplaintModal } from './ResolveComplaintModal';
import { TimelineModal } from './TimelineModal';
import {
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  Camera,
  Eye,
  RotateCcw,
  Star,
} from 'lucide-react';

export const OfficerPortal = ({ user }) => {
  const navigate = useNavigate();
  const { complaintId } = useParams();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState(() =>
    store.getComplaints().filter((c) => c.officer_id === user.user_id)
  );
  const [selectedForResolve, setSelectedForResolve] = useState(null);
  const [selectedForTimeline, setSelectedForTimeline] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState(searchParams.get('filter') || 'ASSIGNED');

  React.useEffect(() => {
    const requestedFilter = searchParams.get('filter');
    setFilter(['ALL', 'ASSIGNED', 'RESOLVED', 'OVERDUE'].includes(requestedFilter) ? requestedFilter : 'ASSIGNED');
  }, [searchParams]);

  const refreshComplaints = () => {
    setComplaints(store.getComplaints().filter((c) => c.officer_id === user.user_id));
  };

  React.useEffect(() => {
    refreshComplaints();
    const unsub = store.subscribe(() => {
      refreshComplaints();
    });
    return unsub;
  }, [user.user_id]);

  React.useEffect(() => {
    if (!complaintId) {
      setSelectedForTimeline(null);
      return;
    }
    const complaint = complaints.find(
      (item) => String(item.complaint_id) === complaintId
    );
    if (!complaint || Number(complaint.officer_id) !== Number(user.user_id)) {
      navigate('/officer/dashboard', { replace: true });
      return;
    }
    let active = true;
    store
      .loadComplaintDetails(complaint.complaint_id)
      .then((details) => {
        if (active) setSelectedForTimeline({ ...complaint, ...details });
      })
      .catch((error) => {
        if (active) showToast(error.message || 'Complaint details could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [complaintId, complaints, user.user_id, navigate]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = complaints.filter(
    (c) => c.status === 'ASSIGNED' && c.deadline && c.deadline < today
  ).length;
  const upcomingDeadlineCount = complaints.filter(
    (c) => c.status === 'ASSIGNED' && c.deadline && c.deadline >= today
  ).length;

  const filtered = complaints.filter((c) => {
    if (filter === 'ALL') return true;
    if (filter === 'OVERDUE') return c.status === 'ASSIGNED' && c.deadline && c.deadline < today;
    return c.status === filter;
  });

  const handleUpdateOfficerPriority = async (complaintId, priority) => {
    try {
      await store.updateOfficerPriority(complaintId, priority);
      showToast(`Officer priority updated to ${priority}`);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleOpenTimeline = async (complaint) => {
    try {
      const details = await store.loadComplaintDetails(complaint.complaint_id);
      setSelectedForTimeline({ ...complaint, ...details });
    } catch (error) {
      showToast(error.message || 'Complaint history could not be loaded.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-4 rounded-xl shadow-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Briefcase className="w-4 h-4 text-blue-400" />
            Officer Portal{user.department_name ? ` · ${user.department_name}` : ''}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{user.name}</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Review your assigned grievances, track deadlines, and submit resolution evidence.
          </p>
        </div>

        {overdueCount > 0 && (
          <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-white">{overdueCount} Case(s) Overdue</div>
              <div className="text-[11px] text-rose-200">Exceeding target SLA resolution date</div>
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Total Assigned
          </span>
          <div className="text-2xl font-black text-slate-900">{complaints.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Dispatched to your ID</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Active Investigations
          </span>
          <div className="text-2xl font-black text-blue-600">
            {complaints.filter((c) => c.status === 'ASSIGNED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting remediation proof</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Resolved Cases
          </span>
          <div className="text-2xl font-black text-emerald-600">
            {complaints.filter((c) => c.status === 'RESOLVED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Completion notes recorded</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Upcoming Deadlines
          </span>
          <div className="text-2xl font-black text-slate-900">{upcomingDeadlineCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active work orders with a deadline</div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">My grievance locations</h2>
          <span className="text-xs text-slate-500">
            {complaints.length ? 'Only cases assigned to your account are shown.' : 'No assigned locations yet.'}
          </span>
        </div>
        <GrievanceMap complaints={complaints} onSelectComplaint={handleOpenTimeline} />
      </section>

      {/* Filter Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          {['ASSIGNED', 'RESOLVED', 'ALL', 'OVERDUE'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                filter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {st === 'ASSIGNED' ? 'In Progress' : st === 'RESOLVED' ? 'Resolved' : st === 'OVERDUE' ? 'Overdue' : 'All Grievances'}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          Showing {filtered.length} work items
        </span>
      </div>

      {/* Complaint Work Items */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No work orders in this view</h3>
          <p className="text-xs text-slate-400 mt-1">All assigned tasks are up to date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => {
            const isOverdue = c.status === 'ASSIGNED' && c.deadline && c.deadline < today;

            return (
              <div
                key={c.complaint_id}
                className={`bg-white rounded-2xl border p-5 transition shadow-xs hover:shadow-md ${
                  isOverdue ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        #{c.complaint_id}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {c.category}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {c.status}
                      </span>
                      {isOverdue && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                          OVERDUE SLA
                        </span>
                      )}
                      {c.resolution_cycle > 1 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-amber-700" />
                          Reopened by Citizen (Cycle #{c.resolution_cycle})
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {c.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        Deadline: <strong className={isOverdue ? 'text-rose-600' : ''}>{c.deadline || 'None'}</strong>
                      </span>
                    </div>

                    {c.citizen_feedback && c.status === 'ASSIGNED' && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mt-2">
                        <div className="font-bold flex items-center gap-1 mb-0.5 text-amber-950">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          Citizen Reopening Feedback ({c.citizen_rating}/5):
                        </div>
                        <p className="italic">"{c.citizen_feedback}"</p>
                      </div>
                    )}
                  </div>

                  {/* Priority & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Officer Priority
                      </span>
                      <div className="flex items-center gap-1">
                        {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                          <button
                            key={p}
                            onClick={() => handleUpdateOfficerPriority(c.complaint_id, p)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md border transition cursor-pointer ${
                              (c.officer_priority || c.priority) === p
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => navigate(`/officer/grievances/${c.complaint_id}`)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Timeline
                      </button>

                      {c.status === 'ASSIGNED' && (
                        <button
                          onClick={() => setSelectedForResolve(c)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Submit Proof & Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedForResolve && (
        <ResolveComplaintModal
          complaint={selectedForResolve}
          onClose={() => {
            setSelectedForResolve(null);
            if (complaintId) navigate('/officer/dashboard');
          }}
          onSuccess={(msg) => {
            refreshComplaints();
            showToast(msg);
          }}
        />
      )}

      {selectedForTimeline && (
        <TimelineModal
          complaint={selectedForTimeline}
          history={store.getStatusHistory(selectedForTimeline.complaint_id)}
          feedbacks={store.getFeedback(selectedForTimeline.complaint_id)}
          onClose={() => {
            setSelectedForTimeline(null);
            if (complaintId) navigate('/officer/dashboard');
          }}
          onResolve={
            selectedForTimeline.status === 'ASSIGNED'
              ? () => {
                  const complaint = selectedForTimeline;
                  setSelectedForTimeline(null);
                  setSelectedForResolve(complaint);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
