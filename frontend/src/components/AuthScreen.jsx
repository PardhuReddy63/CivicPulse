import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  UsersRound,
  Zap,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { store } from '../services/store';

function CivicBuildingIllustration() {
  return (
    <img
      aria-hidden="true"
      src="/assets/civic-building-reference.png"
      alt=""
      className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
    />
  );
}

function BrandMark({ small = false }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-blue-600 font-black tracking-tight text-white shadow-lg shadow-blue-900/20 ${
        small ? 'h-12 w-12 text-lg' : 'h-14 w-14 text-xl'
      }`}
    >
      CP
    </div>
  );
}

export const AuthScreen = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const activationNoticeShown = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (location.pathname === '/reset-password') {
      setMode('reset');
    } else {
      setMode(initialMode);
    }

    setError('');

    if (
      location.state?.activationSuccess &&
      location.pathname === '/login'
    ) {
      activationNoticeShown.current = true;
      setNotice(
        'Your officer account is activated successfully. Sign in with your registered email and new password.'
      );

      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    } else if (!activationNoticeShown.current) {
      setNotice('');
    }
  }, [initialMode, location.pathname, location.state, navigate]);

  const switchMode = (nextMode) => {
    setError('');
    setNotice('');
    setMode(nextMode);
    if (nextMode === 'register') navigate('/register');
    else if (nextMode === 'login') navigate('/login');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (['register', 'reset'].includes(mode) && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

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
        navigate('/login');
      } else if (mode === 'forgot') {
        const result = await store.requestPasswordReset(email.trim());
        setNotice(result.message);
      } else if (mode === 'reset') {
        const token = new URLSearchParams(location.search).get('token');
        if (!token) throw new Error('The password reset link is invalid or incomplete.');
        const result = await store.resetPassword(token, password);
        setNotice(result.message);
        setPassword('');
        setConfirmPassword('');
        navigate('/login', { replace: true });
        setMode('login');
      } else {
        const user = await store.login(email.trim(), password);
        navigate(`/${user.role.toLowerCase()}/dashboard`, { replace: true });
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

  const heading = {
    login: 'Sign in to your account',
    register: 'Create citizen account',
    verify: 'Verify your email',
    forgot: 'Reset your password',
    reset: 'Choose a new password',
  }[mode];

  const description = {
    login: 'Enter your credentials to access the citizen, officer or admin portal.',
    register: 'Create a citizen account to report and track local concerns.',
    verify: 'Enter the six-digit verification code sent to your email address.',
    forgot: 'Enter your account email. If it exists, we will send reset instructions.',
    reset: 'Choose a strong password for your account.',
  }[mode];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 lg:grid lg:grid-cols-[55%_45%]">
      <section className="relative hidden min-h-screen overflow-hidden px-8 py-6 text-white lg:flex lg:flex-col xl:px-12">
        <CivicBuildingIllustration />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-blue-950/20 to-blue-950/5" />
        <div className="relative z-10 flex items-center gap-4">
          <BrandMark small />
          <div>
            <div className="text-2xl font-extrabold tracking-tight xl:text-3xl">
              CivicPulse<span className="text-blue-300">Hub</span>
            </div>
            <p className="text-sm text-blue-50">Municipal Grievance Management &amp; Redressal</p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-blue-100">A better way to be heard</p>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight xl:text-5xl">
            Cleaner Cities
            <span className="block text-blue-300">Stronger Communities</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-blue-50 xl:text-lg">
            Report issues, track progress, and build a better tomorrow.
          </p>
          <div className="mt-6 grid gap-3.5">
            {[
              [FileText, 'Report grievances', 'Lodge civic issues with location and optional photo evidence.', 'bg-blue-500'],
              [MapPin, 'Track real status', 'Follow progress and view updates from the responsible department.', 'bg-emerald-500'],
              [Zap, 'Support resolution', 'Help authorities prioritize and resolve local concerns.', 'bg-amber-500'],
              [UsersRound, 'Safer communities', 'Work together for a cleaner, more responsive city.', 'bg-violet-500'],
            ].map(([Icon, title, text, color]) => (
              <div key={title} className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color} shadow-lg`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold">{title}</h2>
                  <p className="text-xs leading-relaxed text-blue-50 xl:text-sm">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 divide-x divide-white/30 rounded-2xl border border-white/15 bg-slate-950/50 p-3 text-center backdrop-blur-md">
          <div className="px-2"><strong className="block text-xs">For citizens</strong><span className="mt-1 block text-[10px] text-blue-100">Report and track concerns</span></div>
          <div className="px-2"><strong className="block text-xs">For officers</strong><span className="mt-1 block text-[10px] text-blue-100">Manage assigned work</span></div>
          <div className="px-2"><strong className="block text-xs">For administrators</strong><span className="mt-1 block text-[10px] text-blue-100">Coordinate civic response</span></div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-10">
        <div className="w-full max-w-[460px] rounded-[28px] border border-white bg-white p-7 shadow-xl shadow-slate-300/50 sm:p-9">
          <div className="mb-6 flex flex-col items-center text-center">
            <BrandMark />
            <div className="mt-3 text-2xl font-extrabold tracking-tight">
              CivicPulse<span className="text-blue-600">Hub</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Municipal Grievance Management &amp; Redressal</p>
            <h2 className="mt-6 text-2xl font-bold tracking-tight">{heading}</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
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
            {mode === 'register' && (
              <label className="block text-sm font-semibold text-slate-700">
                Full name
                <input
                  autoComplete="name"
                  required
                  maxLength={255}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            )}
            {mode !== 'reset' && (
              <label className="block text-sm font-semibold text-slate-700">
                {mode === 'login' ? 'Username or email' : 'Email address'}
                <span className="relative mt-1.5 block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={mode === 'login' ? 'text' : 'email'}
                    autoComplete={mode === 'login' ? 'username' : 'email'}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </span>
              </label>
            )}
            {mode === 'verify' ? (
              <label className="block text-sm font-semibold text-slate-700">
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
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal tracking-[.3em] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            ) : ['login', 'register', 'reset'].includes(mode) ? (
              <label className="block text-sm font-semibold text-slate-700">
                {mode === 'login' ? 'Password' : 'New password'}
                <span className="relative mt-1.5 block">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={mode === 'login' ? undefined : 8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-12 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            ) : null}
            {['register', 'reset'].includes(mode) && (
              <label className="block text-sm font-semibold text-slate-700">
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            )}
            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => switchMode('forgot')} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                  Forgot password?
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'verify' ? 'Verify email' : mode === 'forgot' ? 'Send reset instructions' : 'Reset password'}
              {!busy && mode === 'login' && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {mode === 'verify' && (
            <button type="button" disabled={busy} onClick={handleResend} className="mt-4 w-full text-sm font-semibold text-blue-700 hover:underline disabled:opacity-50">
              Resend verification code
            </button>
          )}
          <div className="mt-5 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                <p>
                  New citizen?{' '}
                  <button
                    type="button"
                    aria-label="Create an account"
                    onClick={() => switchMode('register')}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Sign Up
                  </button>
                </p>

                <p className="mt-2">
                  Want to join as an officer?{' '}
                  <Link
                    to="/officer/register"
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Register as Officer
                  </Link>
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-semibold text-blue-700 hover:underline"
              >
                Return to sign in
              </button>
            )}
            {mode === 'register' && (
              <p className="mt-2 text-xs">
                Officer and administrator accounts are provisioned securely by an administrator.
              </p>
            )}
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure access for your civic community
          </p>
        </div>
      </section>
    </main>
  );
};
