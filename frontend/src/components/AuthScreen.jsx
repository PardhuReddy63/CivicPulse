import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { store } from '../services/store';

export const AuthScreen = () => {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'register') {
        const result = await store.registerCitizen(name.trim(), email.trim(), password);
        setNotice(result.message);
        setMode('verify');
      } else if (mode === 'verify') {
        const result = await store.verifyOtp(email.trim(), otp.trim());
        setNotice(result.message);
        setMode('login');
        setPassword('');
        setOtp('');
      } else {
        await store.login(email.trim(), password);
      }
    } catch (requestError) {
      setError(requestError.message || 'The request could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await store.resendOtp(email.trim());
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message || 'The code could not be resent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 font-black text-white">
            CP
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">CivicPulse Hub</h1>
            <p className="text-xs text-slate-500">Grievance management & redressal</p>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
          <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
          Sign in with your verified account. Dashboard access is determined by your server role.
        </div>

        <h2 className="mb-1 text-xl font-bold text-slate-900">
          {mode === 'register' ? 'Create citizen account' : mode === 'verify' ? 'Verify your email' : 'Sign in'}
        </h2>
        <p className="mb-5 text-xs text-slate-500">
          {mode === 'verify'
            ? 'Enter the six-digit code sent to your email address.'
            : mode === 'register'
              ? 'A verification code will be sent to your email.'
              : 'Use your registered email and password to continue.'}
        </p>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <label className="block text-xs font-semibold text-slate-700">
              Full name
              <input
                autoComplete="name"
                required
                maxLength={255}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal"
              />
            </label>
          )}
          <label className="block text-xs font-semibold text-slate-700">
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          {mode === 'verify' ? (
            <label className="block text-xs font-semibold text-slate-700">
              Six-digit verification code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={6}
                maxLength={6}
                pattern="[0-9]{6}"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal tracking-[0.3em]"
              />
            </label>
          ) : (
            <label className="block text-xs font-semibold text-slate-700">
              Password
              <input
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'register' ? 8 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Please wait...' : mode === 'register' ? 'Register' : mode === 'verify' ? 'Verify email' : 'Sign in'}
          </button>
        </form>

        {mode === 'verify' && (
          <button type="button" disabled={busy} onClick={handleResend} className="mt-3 w-full text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50">
            Resend verification code
          </button>
        )}
        <div className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <button type="button" onClick={() => switchMode('register')} className="font-semibold text-blue-700 hover:underline">
              New citizen? Create an account
            </button>
          ) : (
            <button type="button" onClick={() => switchMode('login')} className="font-semibold text-blue-700 hover:underline">
              Return to sign in
            </button>
          )}
          {mode === 'register' && (
            <p className="mt-2 text-[11px]">
              Officer and administrator accounts are provisioned by an administrator.
            </p>
          )}
        </div>
      </section>
    </main>
  );
};
