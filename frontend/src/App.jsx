import React, { useEffect, useState } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { store } from './services/store';
import { PortalShell } from './components/PortalShell';
import { CitizenPortal } from './components/CitizenPortal';
import { OfficerPortal } from './components/OfficerPortal';
import { AdminPortal } from './components/AdminPortal';
import { AuthScreen } from './components/AuthScreen';
import { OfficerActivation } from './components/OfficerActivation';
import { OfficerRegistration } from './components/OfficerRegistration';
import { dashboardPathForRole } from './routes';

function RequireRole({ currentUser, roles }) {
  const location = useLocation();
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!roles.includes(currentUser.role)) {
    return <Navigate to={dashboardPathForRole(currentUser.role)} replace />;
  }
  return <Outlet />;
}

function AuthenticatedLayout({ currentUser, onLogout, dataError, reloadData }) {
  return (
    <PortalShell
      currentUser={currentUser}
      onLogout={onLogout}
      dataError={dataError}
      reloadData={reloadData}
    >
      <Outlet />
    </PortalShell>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [dataError, setDataError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = store.subscribe(() => setCurrentUser(store.getCurrentUser()));
    store
      .restoreSession()
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => setLoadingSession(false));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setDataError('');
      return undefined;
    }

    let active = true;
    store
      .loadUserData(currentUser)
      .then(() => {
        if (active) setDataError('');
      })
      .catch((error) => {
        if (active) {
          setDataError(error.message || 'Unable to load database records.');
        }
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    document.title = currentUser
      ? `CivicPulse Hub — ${currentUser.role} Portal`
      : location.pathname === '/register'
        ? 'CivicPulse Hub — Register'
        : 'CivicPulse Hub — Sign in';
  }, [currentUser, location.pathname]);

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

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to={dashboardPathForRole(currentUser.role)} replace /> : <AuthScreen initialMode="login" />}
      />
      <Route
        path="/register"
        element={currentUser ? <Navigate to={dashboardPathForRole(currentUser.role)} replace /> : <AuthScreen initialMode="register" />}
      />
      <Route
        path="/officer/activate"
        element={<OfficerActivation />}
      />
      <Route
        path="/officer/register"
        element={
          currentUser ? (
            <Navigate
              to={dashboardPathForRole(currentUser.role)}
              replace
            />
          ) : (
            <OfficerRegistration />
          )
        }
      />
      <Route
        path="/reset-password"
        element={currentUser ? <Navigate to={dashboardPathForRole(currentUser.role)} replace /> : <AuthScreen initialMode="reset" />}
      />

      <Route element={<RequireRole currentUser={currentUser} roles={['CITIZEN']} />}>
        <Route
          element={
            <AuthenticatedLayout
              currentUser={currentUser}
              onLogout={() => store.logout()}
              dataError={dataError}
              reloadData={reloadData}
            />
          }
        >
          <Route path="/citizen/dashboard" element={<CitizenPortal user={currentUser} />} />
          <Route path="/citizen/grievances/new" element={<CitizenPortal user={currentUser} openNewGrievance />} />
          <Route path="/citizen/grievances/:complaintId" element={<CitizenPortal user={currentUser} />} />
        </Route>
      </Route>

      <Route element={<RequireRole currentUser={currentUser} roles={['OFFICER']} />}>
        <Route
          element={
            <AuthenticatedLayout
              currentUser={currentUser}
              onLogout={() => store.logout()}
              dataError={dataError}
              reloadData={reloadData}
            />
          }
        >
          <Route path="/officer/dashboard" element={<OfficerPortal user={currentUser} />} />
          <Route path="/officer/grievances/:complaintId" element={<OfficerPortal user={currentUser} />} />
        </Route>
      </Route>

      <Route element={<RequireRole currentUser={currentUser} roles={['ADMIN']} />}>
        <Route
          element={
            <AuthenticatedLayout
              currentUser={currentUser}
              onLogout={() => store.logout()}
              dataError={dataError}
              reloadData={reloadData}
            />
          }
        >
          <Route path="/admin/dashboard" element={<AdminPortal user={currentUser} initialTab="triage" />} />
          <Route path="/admin/grievances" element={<AdminPortal user={currentUser} initialTab="triage" />} />
          <Route path="/admin/officers" element={<AdminPortal user={currentUser} initialTab="users" />} />
          <Route path="/admin/grievances/:complaintId" element={<AdminPortal user={currentUser} initialTab="triage" />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={currentUser ? dashboardPathForRole(currentUser.role) : '/login'} replace />}
      />
    </Routes>
  );
}
