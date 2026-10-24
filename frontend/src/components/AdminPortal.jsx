import React, { useState } from 'react';
import { store } from '../services/store';
import { GrievanceMap } from './GrievanceMap';
import { AssignOfficerModal } from './AssignOfficerModal';
import { TimelineModal } from './TimelineModal';
import {
  ShieldAlert,
  FileSpreadsheet,
  Users,
  MapPin,
  Cpu,
  Activity,
  Search,
  Check,
  RotateCcw,
} from 'lucide-react';

export const AdminPortal = ({ user }) => {
  const [complaints, setComplaints] = useState(() => store.getComplaints());
  const [usersList, setUsersList] = useState(() => store.getUsers());
  const [workloads, setWorkloads] = useState(() => store.getOfficerWorkload());
  const [auditLogs, setAuditLogs] = useState(() => store.getAuditLogs());

  const [activeTab, setActiveTab] = useState('triage');
  const [selectedForAssign, setSelectedForAssign] = useState(null);
  const [selectedForTimeline, setSelectedForTimeline] = useState(null);
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
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            Municipal Administration Headquarters • Triage & Redressal Command
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">System Administrator Console</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Triage civic grievances, assign department officers, define SLA deadlines, export XLSX reports,
            and monitor automated reopening metrics.
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
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Official XLSX</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Total Intake
          </span>
          <div className="text-2xl font-black text-slate-900">{totals.TOTAL}</div>
          <div className="text-[11px] text-slate-400 mt-1">Across all 5 departments</div>
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
      </div>

      {/* Admin View Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('triage')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'triage'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Triage & Complaint Queue ({complaints.length})
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'map'
              ? 'bg-purple-600 text-white shadow-xs'
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
              ? 'bg-purple-600 text-white shadow-xs'
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
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Python Analytics Service
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          User Management & RBAC
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-purple-600 text-white shadow-xs'
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
                              onClick={() => handleOpenTimeline(c)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                            >
                              Timeline
                            </button>

                            <button
                              onClick={() => setSelectedForAssign(c)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer"
                            >
                              {c.officer_id ? 'Reassign' : 'Assign'}
                            </button>
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
                  {workloads.map((w) => (
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

      {/* Tab 4: Python Analytics Microservice */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    FastAPI Analytics Microservice Contract (Spec Section 12)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Target Endpoint: POST /api/v1/analyze/trends • Analysis Version: v1.0
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                ONLINE & BOUNDED
              </span>
            </div>

            {/* Microservice Indicators */}
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
                  Resolution SLA Adherence
                </span>
                <div className="text-2xl font-black text-emerald-600">
                  {complaints.length > 0
                    ? `${Math.round(((complaints.length - overdueCount) / complaints.length) * 100)}%`
                    : '100%'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Closed before target resolution date
                </div>
              </div>
            </div>

            {/* Python Generated Insights */}
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Automated Analytical Insights (Descriptive)
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-purple-950">
                <li>
                  <strong>Category Volume:</strong> Roads & Infrastructure and Water Works represent
                  the largest volume of citizen submissions this period.
                </li>
                <li>
                  <strong>Quality Feedback Loop:</strong> Section 9.1 feedback safeguard is
                  protecting citizens by allowing complaints to return to PENDING if work quality is
                  disputed.
                </li>
                <li>
                  <strong>Fault-Tolerant Boundary:</strong> Python service operates in advisory
                  mode; failure does not block grievance writes.
                </li>
              </ul>
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
                {usersList.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(
                            u.user_id,
                            e.target.value,
                            u.department_id
                          )
                        }
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
                          <option value="">No Department</option>
                          {departments.map((d) => (
                            <option key={d.department_id} value={d.department_id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
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
            {auditLogs.map((log) => (
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
          onClose={() => setSelectedForAssign(null)}
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
          onClose={() => setSelectedForTimeline(null)}
        />
      )}
    </div>
  );
};
