import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BriefcaseBusiness, KeyRound, LogOut, ShieldCheck, UserRound, X } from 'lucide-react';
import { dashboardPathForRole } from '../routes';
import { store } from '../services/store';

export const Navbar = ({ currentUser, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const roleIcon =
    currentUser.role === 'ADMIN' ? <ShieldCheck className="h-4 w-4" /> :
      currentUser.role === 'OFFICER' ? <BriefcaseBusiness className="h-4 w-4" /> :
        <UserRound className="h-4 w-4" />;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to={dashboardPathForRole(currentUser.role)}
          aria-label="CivicPulse Hub dashboard"
          className="flex min-w-0 items-center gap-3"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-black text-white shadow-md shadow-blue-700/20">
            CP
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-extrabold tracking-tight text-slate-900">
              CivicPulse<span className="text-blue-700">Hub</span>
            </span>
            <span className="hidden truncate text-[11px] text-slate-500 sm:block">
              Municipal Grievance Management &amp; Redressal
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 border-l border-slate-200 pl-3 sm:pl-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800">
              {roleIcon}
            </span>
            <span className="min-w-0">
              <span className="block max-w-32 truncate text-xs font-bold text-slate-900 sm:max-w-52">
                {currentUser.name}
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {currentUser.role}
                {currentUser.role === 'OFFICER' && currentUser.department_name
                  ? ` · ${currentUser.department_name}`
                  : ''}
              </span>
            </span>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
            >
              Account
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setPasswordError('');
                    setPasswordNotice('');
                    setPasswordDialog(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                >
                  <KeyRound className="h-4 w-4" />
                  Change password
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
      {passwordDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !passwordBusy) {
              setPasswordDialog(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }
          }}
        >
          <section
            aria-labelledby="change-password-title"
            aria-modal="true"
            role="dialog"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="change-password-title" className="text-lg font-bold text-slate-900">Change password</h2>
              <button
                type="button"
                aria-label="Close change password"
                disabled={passwordBusy}
                onClick={() => {
                  setPasswordDialog(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                  setPasswordNotice('');
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {passwordError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{passwordError}</p>}
            {passwordNotice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{passwordNotice}</p>}
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setPasswordError('');
                setPasswordNotice('');
                if (newPassword !== confirmPassword) {
                  setPasswordError('Password confirmation does not match.');
                  return;
                }
                setPasswordBusy(true);
                try {
                  const result = await store.changePassword(currentPassword, newPassword, confirmPassword);
                  setPasswordNotice(result.message);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                } catch (error) {
                  setPasswordError(error.message || 'Password could not be updated.');
                } finally {
                  setPasswordBusy(false);
                }
              }}
            >
              <label className="block text-sm font-semibold text-slate-700">
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <button
                type="submit"
                disabled={passwordBusy}
                className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
              >
                {passwordBusy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </section>
        </div>
      )}
    </header>
  );
};
