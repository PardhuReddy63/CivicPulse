// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../src/services/store';
import { ResolveComplaintModal } from '../../src/components/ResolveComplaintModal';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ResolveComplaintModal evidence requirements', () => {
  const complaint = {
    complaint_id: 82,
    title: 'Repair damaged roof',
    location: 'North Ward School',
  };

  it('rejects unsupported image types with a field-level message', () => {
    render(
      <ResolveComplaintModal
        complaint={complaint}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, {
      target: { files: [new File(['not an image'], 'notes.txt', { type: 'text/plain' })] },
    });
    expect(screen.getByText('Only JPEG, PNG, or WebP files are supported.')).toBeTruthy();
  });

  it('rejects images larger than 5 MB', () => {
    render(
      <ResolveComplaintModal
        complaint={complaint}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [oversized] },
    });
    expect(screen.getByText('Proof photo exceeds 5 MB size limit.')).toBeTruthy();
  });

  it('submits supported image evidence with resolution notes', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const resolveComplaint = vi.spyOn(store, 'resolveComplaint').mockResolvedValue({});
    render(
      <ResolveComplaintModal
        complaint={complaint}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(document.querySelector('textarea'), {
      target: { value: 'The roof panels were replaced and checked.' },
    });
    const image = new File(['supported image data'], 'repair.jpg', { type: 'image/jpeg' });
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [image] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for Admin Review' }));

    await waitFor(() => {
      expect(resolveComplaint).toHaveBeenCalledWith(82, 'The roof panels were replaced and checked.', image);
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
