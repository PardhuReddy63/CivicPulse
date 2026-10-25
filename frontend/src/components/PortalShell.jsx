import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  ClipboardList,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { Navbar } from './Navbar';

const navigationByRole = {
  CITIZEN: [
    { label: 'Home', to: '/citizen/dashboard', icon: LayoutDashboard, end: true },
    { label: 'Lodge a Grievance', to: '/citizen/grievances/new', icon: FilePlus2 },
    { label: 'My Grievances', to: '/citizen/dashboard?view=grievances#grievances', icon: ClipboardList },
    { label: 'My Reports', to: '/citizen/dashboard?view=reports', icon: BarChart3 },
  ],
  OFFICER: [
    { label: 'Dashboard', to: '/officer/dashboard', icon: LayoutDashboard, end: true },
    { label: 'Assigned Grievances', to: '/officer/dashboard?filter=ALL', icon: ClipboardList },
    { label: 'Overdue Cases', to: '/officer/dashboard?filter=OVERDUE', icon: Activity },
    { label: 'Resolution History', to: '/officer/dashboard?filter=RESOLVED', icon: FileText },
  ],
  ADMIN: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, end: true },
    { label: 'All Grievances', to: '/admin/grievances', icon: ClipboardList },
    { label: 'Assign Grievances', to: '/admin/dashboard?view=assign', icon: FilePlus2 },
    { label: 'Officers', to: '/admin/officers', icon: Users },
    { label: 'Reports & Analytics', to: '/admin/dashboard?view=analytics', icon: BarChart3 },
  ],
};

export function PortalShell({ currentUser, onLogout, dataError, reloadData, children }) {
  const items = navigationByRole[currentUser.role] || [];
  const location = useLocation();
  const citizenView = new URLSearchParams(location.search).get('view');

  const isCitizenItemActive = (label) => {
    if (currentUser.role !== 'CITIZEN') return null;

    if (label === 'Home') {
      return (
        location.pathname === '/citizen/dashboard' &&
        !citizenView &&
        location.hash !== '#grievances'
      );
    }

    if (label === 'My Grievances') {
      return (
        location.pathname === '/citizen/dashboard' &&
        (citizenView === 'grievances' || location.hash === '#grievances')
      );
    }

    if (label === 'My Reports') {
      return (
        location.pathname === '/citizen/dashboard' &&
        citizenView === 'reports'
      );
    }

    return null;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 z-0 h-[42vh] w-[min(78vw,1100px)] bg-[url('/assets/portal-skyline-background.svg')] bg-contain bg-bottom-right bg-no-repeat opacity-35"
      />
      <Navbar currentUser={currentUser} onLogout={onLogout} />
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-68px)] max-w-[1600px] grid-cols-1 lg:grid-cols-[238px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-sm lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
          <div className="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400 lg:block">
            {currentUser.role.toLowerCase()} portal
          </div>
          <nav aria-label={`${currentUser.role.toLowerCase()} navigation`} className="flex gap-1 overflow-x-auto lg:flex-col">
            {items.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={`${label}:${to}`}
                to={to}
                end={end ?? true}
                className={({ isActive }) => {
                  const citizenActive = isCitizenItemActive(label);
                  const selected = citizenActive === null ? isActive : citizenActive;

                  return `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition lg:w-full ${
                    selected
                      ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-teal-700'
                  }`;
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
          {dataError && (
            <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              <span>{dataError}</span>
              <button type="button" onClick={reloadData} className="font-bold underline">Retry</button>
            </div>
          )}
          {children}
          <footer className="py-6 text-center text-[11px] text-slate-400">
            CivicPulse Hub · Municipal Grievance Management &amp; Redressal
          </footer>
        </main>
      </div>
    </div>
  );
}
