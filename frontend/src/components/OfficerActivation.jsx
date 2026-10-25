import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { store } from '../services/store';

export function OfficerActivation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!token) {
      setError('This activation link is missing its token. Please contact the administrator for a new link.');
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError('Your password must be between 8 and 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      const result = await store.activateOfficer(token, password);
      setNotice(result.message || 'Your officer account is activated. You can now sign in.');
      setPassword('');
      setConfirmPassword('');
      navigate('/login', {
        replace: true,
        state: { activationSuccess: true },
      });
    } catch (requestError) {
      setError(
        requestError.message ||
          'Account activation failed. The link may have expired or already been used.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-white bg-white p-7 shadow-xl shadow-slate-300/50 sm:p-9">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black text-white shadow-lg">
            CP
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            CivicPulse<span className="text-blue-600">Hub</span>
          </h1>
          <h2 className="mt-5 text-xl font-bold">Activate officer account</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Set a password to finish activating your approved officer account.
            The activation link can only be used once and expires after 30 minutes.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            New password
            <span className="relative mt-1.5 block">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </span>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <button
            type="submit"
            disabled={busy || !token}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Activating account...' : 'Activate account'}
          </button>
        </form>

        <div className="mt-5 border-t border-slate-100 pt-4 text-center">
          <Link to="/login" className="text-sm font-semibold text-blue-700 hover:underline">
            Return to sign in
          </Link>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure officer account activation
        </p>
      </section>
    </main>
  );
}
