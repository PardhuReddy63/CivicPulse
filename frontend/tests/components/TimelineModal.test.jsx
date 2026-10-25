// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimelineModal } from '../../src/components/TimelineModal';

afterEach(() => {
  cleanup();
});

describe('TimelineModal resolution review', () => {
  const complaint = {
    complaint_id: 73,
    title: 'Damaged school roof',
    category: 'Education',
    status: 'RESOLUTION_PENDING_REVIEW',
    resolution_cycle: 1,
    resolved_notes: 'The roof has been repaired and inspected.',
    resolved_image: '/uploads/after.jpg',
  };

  it('allows an administrator to approve evidence for citizen verification', () => {
    const onReviewResolution = vi.fn();
    render(
      <TimelineModal
        complaint={complaint}
        onClose={vi.fn()}
        onReviewResolution={onReviewResolution}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve for citizen verification' }));
    expect(onReviewResolution).toHaveBeenCalledWith('APPROVE', '');
  });

  it('requires an actionable reason before rejecting evidence', () => {
    const onReviewResolution = vi.fn();
    render(
      <TimelineModal
        complaint={complaint}
        onClose={vi.fn()}
        onReviewResolution={onReviewResolution}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const rejectButton = screen.getByRole('button', { name: 'Reject evidence' });
    expect(rejectButton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Rejection reason *'), {
      target: { value: 'Attach a clearer photo showing the completed roof repair.' },
    });
    expect(rejectButton.disabled).toBe(false);
    fireEvent.click(rejectButton);
    expect(onReviewResolution).toHaveBeenCalledWith(
      'REJECT',
      'Attach a clearer photo showing the completed roof repair.'
    );
  });

  it('does not reveal resolution evidence to citizens while it is unapproved', () => {
    render(
      <TimelineModal
        complaint={complaint}
        onClose={vi.fn()}
        canViewResolutionEvidence={false}
      />
    );

    expect(screen.queryByAltText('After proof')).toBeNull();
    expect(screen.queryByText(complaint.resolved_notes)).toBeNull();
    expect(screen.getByText('Resolution evidence will be available after administrator approval.')).toBeTruthy();
  });
});
