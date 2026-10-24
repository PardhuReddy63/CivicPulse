import React, { useEffect, useState } from 'react';
import { AlertCircle, BookOpen } from 'lucide-react';
import { store } from './services/store';
import { Navbar } from './components/Navbar';
import { CitizenPortal } from './components/CitizenPortal';
import { OfficerPortal } from './components/OfficerPortal';
import { AdminPortal } from './components/AdminPortal';
import { AuthScreen } from './components/AuthScreen';
import { DocsModal } from './components/DocsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showDocs, setShowDocs] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    const unsubscribe = store.subscribe(() => setCurrentUser(store.getCurrentUser()));
    store
      .restoreSession()
      .then(async (user) => {
        if (user) await store.loadUserData(user);
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => setLoadingSession(false));
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.title = currentUser
      ? `CivicPulse Hub — ${currentUser.role} Portal`
      : 'CivicPulse Hub — Sign in';
  }, [currentUser]);

  const reloadData = async () => {
    setDataError('');
    try {
      await store.loadUserData();
    } catch (error) {
      setDataError(error.message || 'Unable to load database records.');
    }
  };

  if (loadingSession) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking your session...</div>;
  }
  if (!currentUser) return <AuthScreen />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100/70 font-sans text-slate-800 antialiased">
      <Navbar
        currentUser={currentUser}
        onLogout={() => store.logout()}
        onOpenDocs={() => setShowDocs(true)}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {dataError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{dataError}</span>
            <button type="button" onClick={reloadData} className="font-bold underline">Retry database connection</button>
          </div>
        )}
        {currentUser.role === 'CITIZEN' && <CitizenPortal user={currentUser} />}
        {currentUser.role === 'OFFICER' && <OfficerPortal user={currentUser} />}
        {currentUser.role === 'ADMIN' && <AdminPortal user={currentUser} />}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-8 text-xs text-slate-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <div className="font-bold text-slate-900">CivicPulse Hub — Version 1.0</div>
            <p className="text-[11px] text-slate-400">Grievance Management & Feedback Redressal System</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
            <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">React + Vite</span>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">Express API</span>
            <span className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 font-semibold text-purple-700">MySQL</span>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">FastAPI analytics</span>
          </div>
          <button type="button" onClick={() => setShowDocs(true)} className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800">
            <BookOpen className="h-3.5 w-3.5" /> Windows PowerShell Guide
          </button>
        </div>
      </footer>
      {showDocs && <DocsModal onClose={() => setShowDocs(false)} />}
    </div>
  );
}
