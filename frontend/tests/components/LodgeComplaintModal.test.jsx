// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../src/services/store';
import { LodgeComplaintModal } from '../../src/components/LodgeComplaintModal';

vi.mock('../../src/components/GrievanceMap', () => ({
  GrievanceMap: () => <div data-testid="location-map" />,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LodgeComplaintModal', () => {
  it('shows standard category options when the database has no active departments', () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue([]);

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const categorySelect = screen.getAllByRole('combobox')[0];
    expect(categorySelect.querySelectorAll('option')).toHaveLength(5);
    expect(categorySelect.textContent).toContain('Roads & Infrastructure');
    expect(categorySelect.textContent).toContain('Public Health & Safety');
    expect(screen.getByRole('status').textContent).toContain('Department records are not configured');
    expect(screen.queryByLabelText(/complaint.?id/i)).toBeNull();
  });
});
