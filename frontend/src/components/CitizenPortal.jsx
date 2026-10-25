import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { store } from '../services/store';
import { GrievanceMap } from './GrievanceMap';
import { LodgeComplaintModal } from './LodgeComplaintModal';
import { CitizenFeedbackModal } from './CitizenFeedbackModal';
import { TimelineModal } from './TimelineModal';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  MapPin,
  Calendar,
  Eye,
  RotateCcw,
  BarChart3,
  ShieldCheck,
  Inbox,
  Sparkles,
} from 'lucide-react';

export const CitizenPortal = ({ user, openNewGrievance = false }) => {
  const navigate = useNavigate();
  const { complaintId } = useParams();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState(() =>
    store.getComplaints().filter((c) => c.user_id === user.user_id)
  );
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showLodgeModal, setShowLodgeModal] = useState(openNewGrievance);
  const [selectedForFeedback, setSelectedForFeedback] = useState(null);
  const [selectedForTimeline, setSelectedForTimeline] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const view = searchParams.get('view');

    if (view === 'reports') return 'analytics';
    if (view === 'grievances') return 'grievances';

    return 'home';
  });

  const refreshComplaints = () => {
    setComplaints(store.getComplaints().filter((c) => c.user_id === user.user_id));
  };

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      refreshComplaints();
    });
    return unsubscribe;
  }, [user.user_id]);

  useEffect(() => {
    setShowLodgeModal(openNewGrievance);
  }, [openNewGrievance]);

  useEffect(() => {
    const view = searchParams.get('view');

    if (view === 'reports') {
      setActiveTab('analytics');
    } else if (view === 'grievances' || window.location.hash === '#grievances') {
      setActiveTab('grievances');
    } else {
      setActiveTab('home');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!complaintId) {
      setSelectedForTimeline(null);
      return undefined;
    }

    const complaint = store.getComplaints().find(
      (item) => String(item.complaint_id) === String(complaintId)
    );
    if (!complaint || String(complaint.user_id) !== String(user.user_id)) {
      showToast('This grievance could not be found in your account.', 'warn');
      navigate('/citizen/dashboard', { replace: true });
      return undefined;
    }

    let cancelled = false;
    store
      .loadComplaintDetails(complaintId)
      .then((details) => {
        if (!cancelled) setSelectedForTimeline({ ...complaint, ...details });
      })
      .catch((error) => {
        if (!cancelled) showToast(error.message || 'Complaint history could not be loaded.', 'warn');
      });

    return () => {
      cancelled = true;
    };
  }, [complaintId, navigate, user.user_id]);

  const filteredComplaints = complaints
    .filter((complaint) => {
      if (statusFilter !== 'ALL' && complaint.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && complaint.category !== categoryFilter) return false;
      if (!searchText.trim()) return true;
      const query = searchText.trim().toLowerCase();
      return [complaint.title, complaint.description, complaint.location, complaint.category]
        .some((value) => String(value || '').toLowerCase().includes(query));
    })
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));

  const totals = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'PENDING').length,
    assigned: complaints.filter((c) => c.status === 'ASSIGNED').length,
    resolved: complaints.filter((c) => c.status === 'RESOLVED').length,
  };

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleOpenTimeline = (complaint) =>
    navigate(`/citizen/grievances/${complaint.complaint_id}`);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center justify-between transition animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'warn'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-emerald-50 text-emerald-900 border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'warn' ? (
              <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {activeTab === 'home' && (
        <>
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Citizen Portal • Verified Account
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome, {user.name}
          </h1>
          <p className="text-sm text-blue-100 mt-1 max-w-xl">
            Lodge civic grievances with verified GPS coordinates and photo evidence. Monitor department assignments, review photographic before/after proof, and rate redressal quality.
          </p>
        </div>

        <button
          onClick={() => navigate('/citizen/grievances/new')}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-800 font-bold text-xs hover:bg-blue-50 shadow-lg hover:shadow-xl transition transform active:scale-95 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-blue-600" />
          <span>Lodge New Grievance</span>
        </button>
      </div>

      {/* Metrics Row - Derived from real database records */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Filed</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totals.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Recorded in municipal register</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Triage</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{totals.pending}</div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting admin assignment</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
            <AlertCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{totals.assigned}</div>
          <div className="text-[11px] text-slate-400 mt-1">Assigned to department officer</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{totals.resolved}</div>
          <div className="text-[11px] text-slate-400 mt-1">Completed & ready for rating</div>
        </div>
      </div>

        </>
      )}

      {activeTab === 'grievances' ? (
        <>
          {/* Municipal GIS Map view */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Geographic Map of Grievances</span>
              </h2>
              <span className="text-xs text-slate-400">
                {complaints.length > 0 ? 'Click pins to inspect tickets' : 'Empty GIS View (No Complaints Lodged)'}
              </span>
            </div>
            <GrievanceMap
              complaints={complaints}
              onSelectComplaint={handleOpenTimeline}
            />
          </div>

          {/* Filter Bar */}
          {complaints.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs">
                {['ALL', 'PENDING', 'ASSIGNED', 'RESOLVED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Search my grievances"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search grievances"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:w-48"
              />
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="ALL">All categories</option>
                {[...new Set(complaints.map((complaint) => complaint.category).filter(Boolean))].sort().map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <span className="text-xs text-slate-400">
                Showing {filteredComplaints.length} of {complaints.length} records
              </span>
              </div>
            </div>
          )}

          {/* Empty State vs Complaints Feed */}
          {complaints.length === 0 ? (
            /* REQUIRED EMPTY STATE */
            <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-16 text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                You haven't submitted any grievances yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Report civic issues such as hazardous potholes, broken streetlights, contaminated water, or overflowing garbage dumps directly to your ward municipal authority.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => navigate('/citizen/grievances/new')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition cursor-pointer active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Lodge a Grievance</span>
                </button>
              </div>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No grievances found under status "{statusFilter}"</h3>
              <p className="text-xs text-slate-400 mt-1">Select "ALL" to inspect all your submitted grievances.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredComplaints.map((c) => (
                <div
                  key={c.complaint_id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          #{c.complaint_id}
                        </span>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {c.category}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          c.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'ASSIGNED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{c.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.description}</p>

                    <div className="mt-3.5 space-y-1.5 text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{c.location}</span>
                      </div>
                      {Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude)) && (
                        <div className="text-[10px] font-mono text-slate-400">
                          GPS: {Number(c.latitude).toFixed(5)}, {Number(c.longitude).toFixed(5)}
                        </div>
                      )}
                      {c.officer_name && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Officer: {c.officer_name}</span>
                        </div>
                      )}
                      {c.deadline && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Target Deadline: {c.deadline}</span>
                        </div>
                      )}
                    </div>

                    {c.resolution_cycle > 1 && (
                      <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5 font-medium">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Reopened Ticket (Cycle #{c.resolution_cycle}) — Prior low rating received</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenTimeline(c)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Timeline
                    </button>

                    {c.status === 'RESOLVED' && (
                      <button
                        onClick={() => setSelectedForFeedback(c)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" />
                        {c.citizen_rating ? `Update Rating (${c.citizen_rating}⭐)` : 'Rate Resolution'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : activeTab === 'analytics' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Citizen Personal Analytics Breakdown (/reports/me)
            </h3>
            <p className="text-xs text-slate-500">
              Personal status velocity and complaint counts under citizen ownership calculated from real records.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-400 font-bold block mb-1">Total Registered</span>
                <span className="text-2xl font-black text-slate-800">{totals.total}</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs text-amber-700 font-bold block mb-1">In Processing</span>
                <span className="text-2xl font-black text-amber-700">{totals.pending + totals.assigned}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs text-emerald-700 font-bold block mb-1">Successfully Resolved</span>
                <span className="text-2xl font-black text-emerald-700">{totals.resolved}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modals */}
      {showLodgeModal && (
        <LodgeComplaintModal
          onClose={() => navigate('/citizen/dashboard')}
          onSuccess={(msg) => {
            refreshComplaints();
            showToast(msg, 'success');
          }}
        />
      )}

      {selectedForFeedback && (
        <CitizenFeedbackModal
          complaint={selectedForFeedback}
          onClose={() => setSelectedForFeedback(null)}
          onSuccess={(msg, reopened) => {
            refreshComplaints();
            showToast(msg, reopened ? 'warn' : 'success');
          }}
        />
      )}

      {selectedForTimeline && (
        <TimelineModal
          complaint={selectedForTimeline}
          history={store.getStatusHistory(selectedForTimeline.complaint_id)}
          feedbacks={store.getFeedback(selectedForTimeline.complaint_id)}
          canRate={true}
          onClose={() => navigate('/citizen/dashboard')}
          onOpenFeedback={(c) => setSelectedForFeedback(c)}
        />
      )}
    </div>
  );
};
