// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import App from '../../src/App';

const session = vi.hoisted(() => ({
  currentUser: null,
  loginUser: null,
  listeners: [],
  complaints: [],
  users: [],
  departments: [],
  store: null,
}));

vi.mock('../../src/services/store', () => {
  const store = {
    getCurrentUser: () => session.currentUser,
    subscribe(listener) {
      session.listeners.push(listener);
      return () => {
        session.listeners = session.listeners.filter((item) => item !== listener);
      };
    },
    restoreSession: vi.fn(async () => {
      session.listeners.forEach((listener) => listener());
      return session.currentUser;
    }),
    loadUserData: vi.fn(async () => undefined),
    login: vi.fn(async () => {
      session.currentUser = session.loginUser || {
        user_id: 5,
        name: 'Test Citizen',
        email: 'citizen@example.test',
        role: 'CITIZEN',
      };
      session.listeners.forEach((listener) => listener());
      return session.currentUser;
    }),
    registerCitizen: vi.fn(async () => ({ message: 'Verification code sent.' })),
    verifyOtp: vi.fn(async () => ({ message: 'Email verified.' })),
    resendOtp: vi.fn(async () => ({ message: 'Verification code sent.' })),
    logout() {
      session.currentUser = null;
      session.loginUser = null;
      session.listeners.forEach((listener) => listener());
    },
    getComplaints: () => session.complaints,
    getUsers: () => session.users,
    getOfficerWorkload: () => [],
    getAuditLogs: () => [],
    getTotals: () => ({ TOTAL: 0, PENDING: 0, ASSIGNED: 0, RESOLVED: 0 }),
    getDepartments: () => session.departments,
    getStatusHistory: () => [],
    getFeedback: () => [],
    changePassword: vi.fn(async () => ({ message: 'Password updated successfully.' })),
    setUserRole: vi.fn(async (userId, role, departmentId) => {
      const user = session.users.find((item) => item.user_id === userId);
      Object.assign(user, { role, department_id: departmentId });
      return user;
    }),
    loadComplaintDetails: vi.fn(async (id) => ({
      complaint_id: Number(id),
      title: 'Damaged crossing',
      status: session.complaints.find((item) => Number(item.complaint_id) === Number(id))?.status || 'PENDING',
      user_id: 5,
      resolution_cycle: 1,
    })),
  };
  session.store = store;
  return { store };
});

vi.mock('../../src/components/GrievanceMap', () => ({
  GrievanceMap: () => <div data-testid="map-placeholder" />,
}));

function HistoryControls() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div>
      <output data-testid="current-path">{pathname}</output>
      <button type="button" onClick={() => navigate(-1)}>Browser back</button>
      <button type="button" onClick={() => navigate(1)}>Browser forward</button>
    </div>
  );
}

function renderApp(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
      <HistoryControls />
    </MemoryRouter>
  );
}

beforeEach(() => {
  session.currentUser = null;
  session.loginUser = null;
  session.listeners = [];
  session.complaints = [];
  session.users = [];
  session.departments = [];
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('CivicPulse Hub routes', () => {
  it('opens sign in and supports registration URL plus browser back and forward', async () => {
    renderApp(['/login']);
    expect(await screen.findByRole('heading', { name: 'Sign in to your account' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Create an account/ }));
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/register'));
    expect(screen.getByRole('heading', { name: 'Create citizen account' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/login'));
    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Browser forward' }));
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/register'));
    expect(screen.getByRole('heading', { name: 'Create citizen account' })).toBeTruthy();
  });

  it('submits registration and displays email verification on the register route', async () => {
    renderApp(['/register']);
    await screen.findByRole('heading', { name: 'Create citizen account' });
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Test Citizen' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'citizen@example.test' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'a-secure-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'a-secure-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeTruthy();
    expect(session.store.registerCitizen).toHaveBeenCalledWith(
      'Test Citizen',
      'citizen@example.test',
      'a-secure-password'
    );
  });

  it('signs in, redirects to the citizen dashboard, and navigates to the grievance form', async () => {
    renderApp(['/login']);
    await screen.findByRole('heading', { name: 'Sign in to your account' });
    fireEvent.change(screen.getByLabelText('Username or email'), { target: { value: 'citizen@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-secure-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Welcome, Test Citizen' })).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/citizen/dashboard'));

    fireEvent.click(screen.getByRole('button', { name: 'Lodge New Grievance' }));
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/citizen/grievances/new'));
    expect(await screen.findByRole('heading', { name: 'Lodge New Municipal Grievance' })).toBeTruthy();
    expect(screen.queryByText('Checking your session...')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/citizen/dashboard'));
    expect(screen.queryByRole('heading', { name: 'Lodge New Municipal Grievance' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Browser forward' }));
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/citizen/grievances/new'));
    expect(await screen.findByRole('heading', { name: 'Lodge New Municipal Grievance' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close grievance form' }));
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/citizen/dashboard'));
  });

  it('keeps the authenticated session when dashboard data fails to load after login', async () => {
    session.store.loadUserData.mockRejectedValueOnce(
      new Error('Unable to load complaints.')
    );

    renderApp(['/login']);
    await screen.findByRole('heading', { name: 'Sign in to your account' });
    fireEvent.change(screen.getByLabelText('Username or email'), {
      target: { value: 'citizen@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'a-secure-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Welcome, Test Citizen' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId('current-path').textContent).toBe('/citizen/dashboard');
    });
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to load complaints.');
  });

  it('keeps a restored session when dashboard data fails to load', async () => {
    session.currentUser = {
      user_id: 5,
      name: 'Test Citizen',
      email: 'citizen@example.test',
      role: 'CITIZEN',
    };
    session.store.loadUserData.mockRejectedValueOnce(
      new Error('Unable to load departments.')
    );

    renderApp(['/login']);

    expect(await screen.findByRole('heading', { name: 'Welcome, Test Citizen' })).toBeTruthy();
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to load departments.');
    expect(screen.getByTestId('current-path').textContent).toBe('/citizen/dashboard');
  });

  it('refreshes a direct grievance-detail route into the matching complaint details', async () => {
    session.currentUser = {
      user_id: 5,
      name: 'Test Citizen',
      email: 'citizen@example.test',
      role: 'CITIZEN',
    };
    session.complaints = [{
      complaint_id: 42,
      title: 'Damaged crossing',
      status: 'PENDING',
      user_id: 5,
    }];

    renderApp(['/citizen/grievances/42']);
    expect(await screen.findByText('Ticket #42')).toBeTruthy();
    expect(screen.getByTestId('current-path').textContent).toBe('/citizen/grievances/42');
  });

  it('preserves role restrictions for officer and administrator dashboards', async () => {
    session.currentUser = {
      user_id: 8,
      name: 'Test Officer',
      role: 'OFFICER',
    };
    renderApp(['/citizen/dashboard']);

    expect(await screen.findByText(/Officer Portal/)).toBeTruthy();
    expect(screen.getByTestId('current-path').textContent).toBe('/officer/dashboard');
    expect(screen.getAllByText('Test Officer')).toHaveLength(2);
  });

  it('renders the administrator dashboard only for an administrator session', async () => {
    session.currentUser = {
      user_id: 9,
      name: 'Test Administrator',
      role: 'ADMIN',
    };
    renderApp(['/admin/dashboard']);

    expect(await screen.findByRole('heading', { name: 'Welcome, Test Administrator' })).toBeTruthy();
    expect(screen.getByTestId('current-path').textContent).toBe('/admin/dashboard');
  });

  it.each([
    {
      role: 'OFFICER',
      user_id: 8,
      name: 'Test Officer',
      expectedPath: '/officer/dashboard',
      expectedPortalText: /Officer Portal/,
    },
    {
      role: 'ADMIN',
      user_id: 9,
      name: 'Test Administrator',
      expectedPath: '/admin/dashboard',
      expectedPortalText: /Administrator Portal/,
    },
  ])('redirects a successful $role login to the role portal', async ({
    role,
    user_id,
    name,
    expectedPath,
    expectedPortalText,
  }) => {
    session.loginUser = { user_id, name, email: 'staff@example.test', role };
    renderApp(['/login']);

    await screen.findByRole('heading', { name: 'Sign in to your account' });
    fireEvent.change(screen.getByLabelText('Username or email'), { target: { value: 'staff@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-secure-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(expectedPortalText)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe(expectedPath));
  });

  it('opens an assigned complaint on the officer detail route and exposes resolution action', async () => {
    session.currentUser = {
      user_id: 8,
      name: 'Test Officer',
      role: 'OFFICER',
      department_name: 'Roads & Infrastructure',
    };
    session.complaints = [{
      complaint_id: 42,
      officer_id: 8,
      title: 'Damaged crossing',
      status: 'ASSIGNED',
      category: 'Roads & Infrastructure',
      resolution_cycle: 1,
    }];

    renderApp(['/officer/grievances/42']);

    expect(await screen.findByText('Ticket #42')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit resolution' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Assigned Grievances' })).toBeTruthy();
  });

  it('opens admin grievance details and routes officers to account management', async () => {
    session.currentUser = {
      user_id: 9,
      name: 'Test Administrator',
      role: 'ADMIN',
    };
    session.complaints = [{
      complaint_id: 42,
      title: 'Damaged crossing',
      status: 'PENDING',
      user_id: 5,
      resolution_cycle: 1,
    }];

    renderApp(['/admin/grievances/42']);

    expect(await screen.findByText('Ticket #42')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Assign officer' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Officers' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Officers' }));
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/admin/officers'));
    expect(screen.getByRole('heading', { name: /User Management & Role-Based Access Control/ })).toBeTruthy();
  });

  it('requires a department selection before granting the officer role', async () => {
    session.currentUser = {
      user_id: 9,
      name: 'Test Administrator',
      role: 'ADMIN',
    };
    session.users = [{
      user_id: 12,
      name: 'Verified Resident',
      email: 'resident@example.test',
      role: 'CITIZEN',
      active: 1,
      verified: 1,
      department_id: null,
    }];
    session.departments = [{ department_id: 4, name: 'Roads & Infrastructure' }];
    renderApp(['/admin/officers']);

    const userRow = (await screen.findByText('resident@example.test')).closest('tr');
    fireEvent.change(within(userRow).getAllByRole('combobox')[0], {
      target: { value: 'OFFICER' },
    });
    fireEvent.change(screen.getByLabelText('Department for Verified Resident'), {
      target: { value: '4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign officer role' }));

    await waitFor(() =>
      expect(session.store.setUserRole).toHaveBeenCalledWith(12, 'OFFICER', 4)
    );
    expect(await screen.findByText('OFFICER')).toBeTruthy();
  });

  it.each([
    {
      role: 'CITIZEN',
      user_id: 5,
      name: 'Test Citizen',
      requestedPath: '/admin/officers',
      expectedPath: '/citizen/dashboard',
      expectedText: 'Welcome, Test Citizen',
    },
    {
      role: 'OFFICER',
      user_id: 8,
      name: 'Test Officer',
      requestedPath: '/admin/dashboard',
      expectedPath: '/officer/dashboard',
      expectedText: /Officer Portal/,
    },
    {
      role: 'ADMIN',
      user_id: 9,
      name: 'Test Administrator',
      requestedPath: '/officer/grievances/42',
      expectedPath: '/admin/dashboard',
      expectedText: /Administrator Portal/,
    },
  ])('redirects $role away from another role portal', async ({
    role,
    user_id,
    name,
    requestedPath,
    expectedPath,
    expectedText,
  }) => {
    session.currentUser = { user_id, name, role };
    renderApp([requestedPath]);

    expect(await screen.findByText(expectedText)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe(expectedPath));
  });

  it('keeps the public header controls and removes developer actions and footer details', async () => {
    session.currentUser = {
      user_id: 5,
      name: 'Test Citizen',
      role: 'CITIZEN',
    };
    renderApp(['/citizen/dashboard']);

    expect(await screen.findByRole('link', { name: 'CivicPulse Hub dashboard' })).toBeTruthy();
    expect(screen.getByText('CITIZEN')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sign out/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Docs/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Project ZIP/ })).toBeNull();
    expect(screen.getByText('CivicPulse Hub · Municipal Grievance Management & Redressal')).toBeTruthy();
    expect(screen.queryByText(/Windows PowerShell Guide|React \+ Vite|Express API|FastAPI analytics/)).toBeNull();
  });

  it('allows an administrator to access the portal and change password voluntarily', async () => {
    session.loginUser = {
      user_id: 9,
      name: 'Test Administrator',
      email: 'local-admin-test',
      role: 'ADMIN',
      must_change_password: true,
    };
    renderApp(['/login']);

    await screen.findByRole('heading', { name: 'Sign in to your account' });
    fireEvent.change(screen.getByLabelText('Username or email'), { target: { value: 'local-admin-test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-login-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Administrator Portal')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/admin/dashboard'));
    expect(screen.queryByText('Set your administrator password')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Change password' }));
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'test-login-password' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'a-strong-new-password-2026' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'a-strong-new-password-2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Password updated successfully.')).toBeTruthy();
    expect(session.store.changePassword).toHaveBeenCalledWith(
      'test-login-password',
      'a-strong-new-password-2026',
      'a-strong-new-password-2026'
    );
  });
});
