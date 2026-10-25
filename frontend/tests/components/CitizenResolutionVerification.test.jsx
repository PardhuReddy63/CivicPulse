// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../../src/services/store';
import { CitizenPortal } from '../../src/components/CitizenPortal';

vi.mock('../../src/components/GrievanceMap', () => ({
  GrievanceMap: () => <div data-testid="citizen-map" />,
}));

vi.mock('../../src/components/ProtectedEvidenceImage', () => ({
  ProtectedEvidenceImage: ({ alt }) => <img alt={alt} />,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Citizen resolution verification', () => {
  it.each([
    { label: 'Yes, resolved', decision: 'RESOLVED' },
    { label: 'No, not resolved', decision: 'NOT_RESOLVED' },
  ])('records the citizen choice "$label"', async ({ label, decision }) => {
    const complaint = {
      complaint_id: 81,
      user_id: 9,
      title: 'School roof damage',
      description: 'The roof is damaged.',
      category: 'Education',
      location: 'North Ward School',
      status: 'AWAITING_CITIZEN',
      resolution_cycle: 1,
      resolved_notes: 'The roof has been repaired.',
      resolved_image: '/uploads/after.jpg',
    };
    vi.spyOn(store, 'getComplaints').mockReturnValue([complaint]);
    vi.spyOn(store, 'subscribe').mockReturnValue(vi.fn());
    const verifyResolution = vi.spyOn(store, 'verifyResolution').mockResolvedValue({
      decision,
    });

    render(
      <MemoryRouter>
        <CitizenPortal user={{ user_id: 9, name: 'Citizen' }} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => {
      expect(verifyResolution).toHaveBeenCalledWith(
        81,
        decision,
        decision === 'RESOLVED'
          ? 'Citizen confirmed the grievance is resolved.'
          : 'Citizen reported the grievance is not resolved.'
      );
    });
  });
});
