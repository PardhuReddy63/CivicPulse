import React, { useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Download,
  FileSpreadsheet,
  LogOut,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { store } from '../services/store';
import { generateFullProjectZip } from '../services/zipGenerator';

export const Navbar = ({ currentUser, onLogout, onOpenDocs }) => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleDownloadZip = async () => {
    setBusy(true);
    setMessage('');
    try {
      const blob = await generateFullProjectZip();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'CivicPulse_Hub_Complete_Project_v1.0.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message || 'Project archive could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const roleIcon =
    currentUser.role === 'ADMIN' ? (
      <ShieldAlert className="h-3.5 w-3.5" />
    ) : currentUser.role === 'OFFICER' ? (
      <Briefcase className="h-3.5 w-3.5" />
    ) : (
      <UserCheck className="h-3.5 w-3.5" />
    );
  const roleColor =
    currentUser.role === 'ADMIN'
      ? 'text-purple-700'
      : currentUser.role === 'OFFICER'
        ? 'text-blue-700'
        : 'text-emerald-700';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 font-black text-white shadow-md">
            CP
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold tracking-tight text-slate-900">
              CivicPulse<span className="text-blue-600">Hub</span>
            </div>
            <p className="hidden truncate text-xs text-slate-500 sm:block">Municipal Grievance Management & Redressal</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
            <span className={roleColor}>{roleIcon}</span>
            <div>
              <div className="max-w-36 truncate text-xs font-semibold text-slate-900">{currentUser.name}</div>
              <div className="text-[10px] font-bold text-slate-500">{currentUser.role}</div>
            </div>
          </div>
          {currentUser.role === 'ADMIN' && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await store.exportToExcel();
                  setMessage('');
                } catch (error) {
                  setMessage(error.message || 'Report export failed.');
                }
              }}
              className="hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 sm:inline-flex"
            >
              <FileSpreadsheet className="h-4 w-4" /> XLSX
            </button>
          )}
          <button type="button" onClick={onOpenDocs} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={busy}
            className="hidden items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 md:inline-flex"
          >
            <Download className="h-4 w-4" />{busy ? 'Packaging...' : 'Project ZIP'}
          </button>
          <button type="button" onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
      {message && <div role="alert" className="mx-auto max-w-7xl px-4 pb-2 text-xs text-rose-700">{message}</div>}
    </header>
  );
};
