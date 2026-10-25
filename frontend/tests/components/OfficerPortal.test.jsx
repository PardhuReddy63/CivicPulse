// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../../src/services/store';
import { OfficerPortal } from '../../src/components/OfficerPortal';

vi.mock('../../src/components/GrievanceMap', () => ({
  GrievanceMap: () => <div data-testid="officer-map" />,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('OfficerPortal assignment visibility', () => {
  it('shows work assigned to the officer and excludes complaints assigned to another officer', () => {
    vi.spyOn(store, 'getComplaints').mockReturnValue([
      {
        complaint_id: 501,
        title: 'Damaged classroom roof',
        category: 'Education',
        sub_category: 'School Building Damage',
        status: 'ASSIGNED',
        officer_id: '22',
        user_id: 8,
        priority: 'HIGH',
      },
      {
        complaint_id: 502,
        title: 'Other department grievance',
        category: 'Education',
        sub_category: 'School Building Damage',
        status: 'ASSIGNED',
        officer_id: 32,
        user_id: 9,
        priority: 'MEDIUM',
      },
    ]);
    vi.spyOn(store, 'subscribe').mockReturnValue(vi.fn());
    vi.spyOn(store, 'refreshComplaints').mockResolvedValue();

    render(
      <MemoryRouter>
        <OfficerPortal user={{ user_id: 22, name: 'Education Officer', department_name: 'Education' }} />
      </MemoryRouter>
    );

    expect(screen.getByText('Damaged classroom roof')).toBeTruthy();
    expect(screen.queryByText('Other department grievance')).toBeNull();
    expect(screen.getByText('Total Assigned').parentElement.querySelector('.text-2xl').textContent).toBe('1');
  });

  it('refreshes assigned grievances automatically while the officer dashboard is open', async () => {
    vi.useFakeTimers();
    let currentComplaints = [];
    const listeners = [];
    vi.spyOn(store, 'getComplaints').mockImplementation(() => currentComplaints);
    vi.spyOn(store, 'subscribe').mockImplementation((listener) => {
      listeners.push(listener);
      return () => listeners.splice(listeners.indexOf(listener), 1);
    });
    const refreshComplaints = vi.spyOn(store, 'refreshComplaints').mockImplementation(async () => {
      currentComplaints = [{
        complaint_id: 501,
        title: 'New Education grievance',
        category: 'Education',
        status: 'ASSIGNED',
        officer_id: 22,
        user_id: 8,
      }];
      listeners.forEach((listener) => listener());
    });

    render(
      <MemoryRouter>
        <OfficerPortal user={{ user_id: 22, name: 'Education Officer', department_name: 'Education' }} />
      </MemoryRouter>
    );

    expect(screen.getByText(/New grievances are automatically assigned/)).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(refreshComplaints).toHaveBeenCalledTimes(1);
    expect(screen.getByText('New Education grievance')).toBeTruthy();
  });

  it('lets the assigned officer start investigation and refreshes the dashboard', async () => {
    const complaint = {
      complaint_id: 503,
      title: 'Broken streetlight',
      category: 'Public Works',
      status: 'ASSIGNED',
      officer_id: 22,
      user_id: 8,
    };
    vi.spyOn(store, 'getComplaints').mockReturnValue([complaint]);
    vi.spyOn(store, 'subscribe').mockReturnValue(vi.fn());
    vi.spyOn(store, 'refreshComplaints').mockResolvedValue();
    const startWork = vi.spyOn(store, 'startWork').mockResolvedValue({
      ...complaint,
      status: 'IN_PROGRESS',
    });

    render(
      <MemoryRouter>
        <OfficerPortal user={{ user_id: 22, name: 'Officer' }} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Investigation' }));

    expect(startWork).toHaveBeenCalledWith(503);
    expect(await screen.findByText('Investigation started.')).toBeTruthy();
  });
});
