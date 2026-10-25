// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtectedEvidenceImage } from '../../src/components/ProtectedEvidenceImage';
import { ApiClient } from '../../src/services/apiClient';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ProtectedEvidenceImage', () => {
  it('fetches evidence using the authenticated API and renders it as a blob URL', async () => {
    const blob = new Blob(['image']);
    vi.spyOn(ApiClient, 'getToken').mockReturnValue('session-token');
    vi.spyOn(ApiClient, 'fetchEvidence').mockResolvedValue(blob);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:evidence'),
      revokeObjectURL: vi.fn(),
    });

    render(
      <ProtectedEvidenceImage
        complaintId={17}
        type="BEFORE"
        alt="Before proof"
        className="evidence"
      />
    );

    await waitFor(() => expect(screen.getByAltText('Before proof').getAttribute('src')).toBe('blob:evidence'));
    expect(ApiClient.fetchEvidence).toHaveBeenCalledWith(17, 'BEFORE', expect.any(AbortSignal));
  });

  it('shows an error when evidence cannot be loaded', async () => {
    vi.spyOn(ApiClient, 'fetchEvidence').mockRejectedValue(new Error('Not authorized to view this evidence.'));

    render(<ProtectedEvidenceImage complaintId={17} type="AFTER" alt="After proof" />);

    expect((await screen.findByRole('alert')).textContent).toContain('Not authorized to view this evidence.');
  });
});
