import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { store } from '../services/store';
import { ApiClient } from '../services/apiClient';
import { GrievanceMap } from './GrievanceMap';
import { AssignOfficerModal } from './AssignOfficerModal';
import { TimelineModal } from './TimelineModal';
import {
  ShieldAlert,
  FileSpreadsheet,
  Users,
  MapPin,
  Activity,
  Search,
  Check,
  RotateCcw,
} from 'lucide-react';

export const AdminPortal = ({ user, initialTab = 'triage' }) => {
  const navigate = useNavigate();
  const { complaintId } = useParams();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState(() => store.getComplaints());
  const [usersList, setUsersList] = useState(() => store.getUsers());
  const [workloads, setWorkloads] = useState(() => store.getOfficerWorkload());
  const [auditLogs, setAuditLogs] = useState(() => store.getAuditLogs());

  const [officerApplications, setOfficerApplications] = useState([]);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('PENDING');
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationActionId, setApplicationActionId] = useState(null);
  const [applicationError, setApplicationError] = useState('');

  const initialView = searchParams.get('view');
  const [activeTab, setActiveTab] = useState(
    initialView === 'analytics' ? 'analytics' : initialView === 'map' ? 'map' : initialTab
  );
  const [selectedForAssign, setSelectedForAssign] = useState(null);
  const [selectedForTimeline, setSelectedForTimeline] = useState(null);
  const [pendingOfficerAssignment, setPendingOfficerAssignment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  const departments = store.getDepartments();

  const refreshAll = () => {
    setComplaints(store.getComplaints());
    setUsersList(store.getUsers());
    setWorkloads(store.getOfficerWorkload());
    setAuditLogs(store.getAuditLogs());
  };

  React.useEffect(() => {
    refreshAll();
    const unsub = store.subscribe(() => {
      refreshAll();
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    const view = searchParams.get('view');
    setActiveTab(view === 'analytics' ? 'analytics' : view === 'map' ? 'map' : initialTab);
    if (view === 'assign') setStatusFilter('PENDING');
  }, [initialTab, searchParams]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = complaints.filter(
    (c) => c.status === 'ASSIGNED' && c.deadline && c.deadline < today
  ).length;

  const totals = store.getTotals();

  const reopenedTickets = complaints.filter((c) => c.resolution_cycle > 1);
  const reopeningRate = complaints.length > 0 ? ((reopenedTickets.length / complaints.length) * 100).toFixed(1) : '0';
  const categoryCounts = Object.entries(
    complaints.reduce((counts, complaint) => {
      counts[complaint.category] = (counts[complaint.category] || 0) + 1;
      return counts;
    }, {})
  ).sort((left, right) => right[1] - left[1]);

  React.useEffect(() => {
    if (!complaintId) {
      setSelectedForTimeline(null);
      return;
    }
    const complaint = complaints.find(
      (item) => String(item.complaint_id) === complaintId
    );
    if (!complaint) {
      showToast('That grievance is not available.');
      navigate('/admin/grievances', { replace: true });
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
  }, [complaintId, complaints, navigate]);

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const loadOfficerApplications = async (status = applicationStatusFilter) => {
    setApplicationsLoading(true);
    setApplicationError('');

    try {
      const response = await ApiClient.listOfficerApplications(status);
      setOfficerApplications(response?.data?.applications || []);
    } catch (error) {
      setApplicationError(error.message || 'Unable to load officer applications.');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleReviewOfficerApplication = async (requestId, status) => {
    const decision = status === 'APPROVED' ? 'approve' : 'reject';

    if (!window.confirm(`Are you sure you want to ${decision} this application?`)) {
      return;
    }

    setApplicationActionId(requestId);
    setApplicationError('');

    try {
      await ApiClient.reviewOfficerApplication(requestId, status);
      showToast(`Officer application ${decision}d successfully.`);
      await loadOfficerApplications(applicationStatusFilter);
    } catch (error) {
      setApplicationError(error.message || `Unable to ${decision} application.`);
    } finally {
      setApplicationActionId(null);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'officerApplications') {
      loadOfficerApplications(applicationStatusFilter);
    }
  }, [activeTab, applicationStatusFilter]);

  const handleToggleUserActive = async (userId) => {
    try {
      await store.toggleUserActive(userId);
      refreshAll();
      showToast('User activation state updated in audit logs.');
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRoleChange = async (userId, newRole, deptId) => {
    try {
      await store.setUserRole(userId, newRole, deptId);
      refreshAll();
      showToast(`User role updated to ${newRole}`);
      return true;
    } catch (e) {
      alert(e.message);
      return false;
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
        <div className="p-4 rounded-xl shadow-lg border border-purple-300 bg-purple-50 text-purple-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Admin Hero Header */}
      <div className="bg-gradient-to-r from-blue-700 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            Administrator Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Welcome, {user.name}</h1>
          <p className="text-sm text-blue-50 mt-1 max-w-xl">
            Review real grievances, manage assignments, and monitor municipal service performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                await store.exportToExcel();
              } catch (error) {
                showToast(error.message || 'Report export failed.');
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-blue-50 text-blue-800 font-bold text-xs shadow transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Official XLSX</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Total Intake
          </span>
          <div className="text-2xl font-black text-slate-900">{totals.TOTAL}</div>
          <div className="text-[11px] text-slate-400 mt-1">Grievances in the database</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block mb-2">
            Pending Triage
          </span>
          <div className="text-2xl font-black text-amber-600">{totals.PENDING}</div>
          <div className="text-[11px] text-amber-700 mt-1">Requires officer assignment</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-2">
            Active Investigations
          </span>
          <div className="text-2xl font-black text-blue-600">{totals.ASSIGNED}</div>
          <div className="text-[11px] text-blue-700 mt-1">Assigned & in remediation</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-2">
            Resolved Grievances
          </span>
          <div className="text-2xl font-black text-emerald-600">{totals.RESOLVED}</div>
          <div className="text-[11px] text-emerald-700 mt-1">Proof uploaded</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block mb-2">
            SLA Overdue
          </span>
          <div className="text-2xl font-black text-rose-600">{overdueCount}</div>
          <div className="text-[11px] text-rose-700 mt-1">Breached target deadline</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block mb-2">
            Reopened
          </span>
          <div className="text-2xl font-black text-amber-700">{reopenedTickets.length}</div>
          <div className="text-[11px] text-amber-700 mt-1">Reopened after citizen feedback</div>
        </div>
      </div>

      {activeTab === 'triage' && (
        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Grievances by status</h2>
            <div className="mt-4 space-y-3">
              {[
                ['Pending', totals.PENDING, 'bg-amber-500'],
                ['Assigned', totals.ASSIGNED, 'bg-blue-600'],
                ['Resolved', totals.RESOLVED, 'bg-emerald-500'],
              ].map(([label, count, color]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>{label}</span><span className="font-bold">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${totals.TOTAL ? (count / totals.TOTAL) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Grievances by category</h2>
            {categoryCounts.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">No grievance records yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                {categoryCounts.map(([category, count]) => (
                  <li key={category} className="flex justify-between gap-3">
                    <span className="truncate">{category}</span><span className="font-bold">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Grievance locations</h2>
            <GrievanceMap complaints={complaints} onSelectComplaint={handleOpenTimeline} />
          </div>
        </section>
      )}

      {/* Admin View Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('triage')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'triage'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Triage & Complaint Queue ({complaints.length})
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'map'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Municipal GIS Map
        </button>
        <button
          onClick={() => setActiveTab('workload')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'workload'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Officer Workloads & SLA
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Operational metrics
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          User Management & RBAC
        </button>
        <button
          onClick={() => setActiveTab('officerApplications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'officerApplications'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Officer Applications
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Triage Queue */}
      {activeTab === 'triage' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints, streets, IDs..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {['ALL', 'PENDING', 'ASSIGNED', 'RESOLVED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      statusFilter === s
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs p-2 rounded-xl border border-slate-300 bg-white cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Ticket</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Citizen</th>
                    <th className="p-4">Status & Priority</th>
                    <th className="p-4">Assigned Officer</th>
                    <th className="p-4">Deadline</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No grievances matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((c) => {
                      const isOverdue = c.status === 'ASSIGNED' && c.deadline && c.deadline < today;

                      return (
                        <tr key={c.complaint_id} className="hover:bg-slate-50/70 transition">
                          <td className="p-4 font-mono font-bold text-slate-900">
                            #{c.complaint_id}
                          </td>
                          <td className="p-4 max-w-xs">
                            <div className="font-bold text-slate-900 line-clamp-1">{c.title}</div>
                            <div className="text-[11px] text-blue-600 font-medium">{c.category}</div>
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              {c.location}
                            </div>
                            {c.resolution_cycle > 1 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 font-semibold">
                                <RotateCcw className="w-3 h-3" />
                                Reopened (Cycle #{c.resolution_cycle})
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-800">{c.citizen_name}</div>
                            <div className="text-[10px] text-slate-400">{c.citizen_email}</div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  c.status === 'RESOLVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.status === 'ASSIGNED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {c.status}
                              </span>
                              <div>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    c.priority === 'HIGH'
                                      ? 'bg-rose-100 text-rose-800'
                                      : c.priority === 'MEDIUM'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {c.priority}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {c.officer_name ? (
                              <div>
                                <div className="font-bold text-slate-800">{c.officer_name}</div>
                                <div className="text-[10px] text-slate-400">
                                  {c.officer_department_name}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] italic text-slate-400">Unassigned</span>
                            )}
                          </td>
                          <td className="p-4">
                            {c.deadline ? (
                              <div className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                {c.deadline}
                                {isOverdue && (
                                  <div className="text-[9px] uppercase tracking-wider text-rose-600 font-bold">
                                    Overdue SLA
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => navigate(`/admin/grievances/${c.complaint_id}`)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                            >
                              Timeline
                            </button>

                            {c.status !== 'RESOLVED' && (
                              <button
                                onClick={() => setSelectedForAssign(c)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer"
                              >
                                {c.officer_id ? 'Reassign' : 'Assign'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: GIS Map */}
      {activeTab === 'map' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Municipal Geographic Information System (GIS)
              </h3>
              <p className="text-xs text-slate-500">
                Interactive territory pins within current coordinates. Click any pin to inspect or assign.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              {complaints.length} Active Pins Bound
            </span>
          </div>

          <GrievanceMap
            complaints={complaints}
            onSelectComplaint={handleOpenTimeline}
          />
        </div>
      )}

      {/* Tab 3: Officer Workloads */}
      {activeTab === 'workload' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Department Officer Capacity & SLA Performance
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time monitoring of assigned workloads and SLA deadline adherence.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Officer</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Active Tickets</th>
                    <th className="p-3">Resolved</th>
                    <th className="p-3">Overdue SLA</th>
                    <th className="p-3">Lifetime Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workloads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No officer workload records are available.
                      </td>
                    </tr>
                  ) : workloads.map((w) => (
                    <tr key={w.user_id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{w.name}</td>
                      <td className="p-3 text-slate-600">{w.department_name}</td>
                      <td className="p-3">
                        <span className="font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50">
                          {w.active_cases}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-600 px-2 py-0.5 rounded bg-emerald-50">
                          {w.resolved_cases}
                        </span>
                      </td>
                      <td className="p-3">
                        {w.overdue_cases > 0 ? (
                          <span className="font-bold text-rose-600 px-2 py-0.5 rounded bg-rose-50 animate-pulse">
                            {w.overdue_cases} Overdue
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-semibold">{w.total_assigned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Operational metrics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Grievance operational metrics
                  </h3>
                  <span className="text-xs text-slate-500">
                    Calculated from the grievances currently loaded from the database
                  </span>
                </div>
              </div>
            </div>

            {/* Database-backed metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  Automated Reopening Rate
                </span>
                <div className="text-2xl font-black text-amber-600">{reopeningRate}%</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {reopenedTickets.length} grievance(s) reopened by 1–2 star citizen ratings
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  High Urgency Ratio
                </span>
                <div className="text-2xl font-black text-rose-600">
                  {complaints.length > 0
                    ? Math.round(
                        (complaints.filter((c) => c.priority === 'HIGH').length /
                          complaints.length) *
                          100
                      )
                    : 0}
                  %
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Classified as HIGH municipal triage priority
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  Overdue assigned grievances
                </span>
                <div className="text-2xl font-black text-rose-600">{overdueCount}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Currently overdue assigned grievances
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                Grievances by category
              </h4>
              {categoryCounts.length === 0 ? (
                <p className="text-xs text-slate-500">No grievance records are available yet.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-700">
                  {categoryCounts.map(([category, count]) => (
                    <li key={category} className="flex justify-between gap-4">
                      <span>{category}</span>
                      <span className="font-semibold">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: User Management & RBAC */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">User Management & Role-Based Access Control</h3>
            <p className="text-xs text-slate-500">
              Manage citizen, department officer, and administrative role assignments with audit logs.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Account State</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No user accounts are available.
                    </td>
                  </tr>
                ) : usersList.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) => {
                          if (e.target.value === 'OFFICER' && !u.department_id) {
                            setPendingOfficerAssignment({
                              userId: u.user_id,
                              departmentId: '',
                            });
                            return;
                          }
                          setPendingOfficerAssignment(null);
                          handleRoleChange(
                            u.user_id,
                            e.target.value,
                            e.target.value === 'OFFICER' ? u.department_id : null
                          );
                        }}
                        className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-semibold cursor-pointer"
                      >
                        <option value="CITIZEN">CITIZEN</option>
                        <option value="OFFICER">OFFICER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {u.role === 'OFFICER' ? (
                        <select
                          value={u.department_id || ''}
                          onChange={(e) =>
                            handleRoleChange(
                              u.user_id,
                              u.role,
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white cursor-pointer"
                        >
                          <option value="">Select department</option>
                          {departments.map((d) => (
                            <option key={d.department_id} value={d.department_id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      ) : pendingOfficerAssignment?.userId === u.user_id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`Department for ${u.name}`}
                            value={pendingOfficerAssignment.departmentId}
                            onChange={(e) =>
                              setPendingOfficerAssignment({
                                ...pendingOfficerAssignment,
                                departmentId: e.target.value,
                              })
                            }
                            className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="">Select department</option>
                            {departments.map((d) => (
                              <option key={d.department_id} value={d.department_id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!pendingOfficerAssignment.departmentId}
                            onClick={async () => {
                              const updated = await handleRoleChange(
                                u.user_id,
                                'OFFICER',
                                Number(pendingOfficerAssignment.departmentId)
                              );
                              if (updated) setPendingOfficerAssignment(null);
                            }}
                            className="rounded-lg bg-blue-600 px-2 py-1.5 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Assign officer role
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {u.user_id !== user.user_id && (
                        <button
                          onClick={() => handleToggleUserActive(u.user_id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                            u.active
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Officer Applications */}
      {activeTab === 'officerApplications' && (
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Officer Registration Applications
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Review applications before granting officer access.
                  Approval does not automatically create an account.
                </p>
              </div>

              <select
                value={applicationStatusFilter}
                onChange={(event) => setApplicationStatusFilter(event.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                aria-label="Filter officer applications by status"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ALL">All applications</option>
              </select>
            </div>
          </div>

          {applicationError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {applicationError}
              <button
                type="button"
                onClick={() => loadOfficerApplications(applicationStatusFilter)}
                className="ml-3 font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          {applicationsLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              Loading officer applications...
            </div>
          ) : officerApplications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-800">No applications found</h3>
              <p className="text-sm text-slate-500 mt-1">
                There are no applications matching this status.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {officerApplications.map((application) => (
                <article
                  key={application.request_id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {application.full_name}
                        </h3>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            application.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : application.status === 'APPROVED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {application.status}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
                        <p className="text-slate-600 break-all">
                          <span className="font-semibold text-slate-800">Email: </span>
                          {application.email}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-800">Phone: </span>
                          {application.phone}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-800">Department: </span>
                          {application.department_name}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-800">Designation: </span>
                          {application.designation}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-800">Application ID: </span>
                          #{application.request_id}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-800">Submitted: </span>
                          {application.created_at
                            ? new Date(application.created_at).toLocaleString()
                            : 'Not available'}
                        </p>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                          Reason for applying
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                          {application.reason}
                        </p>
                      </div>

                      {application.review_notes && (
                        <div className="mt-3 text-sm text-slate-600">
                          <span className="font-semibold">Review notes: </span>
                          {application.review_notes}
                        </div>
                      )}
                    </div>

                    {application.status === 'PENDING' && (
                      <div className="flex md:flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={applicationActionId === application.request_id}
                          onClick={() =>
                            handleReviewOfficerApplication(
                              application.request_id,
                              'APPROVED'
                            )
                          }
                          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50"
                        >
                          {applicationActionId === application.request_id
                            ? 'Processing...'
                            : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={applicationActionId === application.request_id}
                          onClick={() =>
                            handleReviewOfficerApplication(
                              application.request_id,
                              'REJECTED'
                            )
                          }
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => loadOfficerApplications(applicationStatusFilter)}
              disabled={applicationsLoading}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh applications
            </button>
          </div>
        </section>
      )}

      {/* Tab 6: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Immutable Audit Trail</h3>
            <p className="text-xs text-slate-500">
              Security and administrative records (role changes, assignments, status transitions).
            </p>
          </div>

          <div className="divide-y divide-slate-100 font-mono text-xs">
            {auditLogs.length === 0 ? (
              <p className="py-8 text-center font-sans text-slate-400">No audit records are available.</p>
            ) : auditLogs.map((log) => (
              <div key={log.audit_id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-700">{log.action}</span>
                    <span className="text-slate-400 text-[10px]">[{log.entity_type}]</span>
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    Actor: {log.actor_name} ({log.actor_role})
                  </div>
                  {log.details_json && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {JSON.stringify(log.details_json)}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedForAssign && (
        <AssignOfficerModal
          complaint={selectedForAssign}
          onClose={() => {
            setSelectedForAssign(null);
            if (complaintId) navigate('/admin/grievances');
          }}
          onSuccess={(msg) => {
            refreshAll();
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
            if (complaintId) navigate('/admin/grievances');
          }}
          onAssign={
            selectedForTimeline.status !== 'RESOLVED'
              ? () => {
                  setSelectedForAssign(selectedForTimeline);
                  setSelectedForTimeline(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
