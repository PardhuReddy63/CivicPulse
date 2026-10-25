// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from '../../src/components/AppErrorBoundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AppErrorBoundary', () => {
  it('shows a recovery action instead of a blank page when a child fails to render', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenPage() {
      throw new Error('render failure');
    }

    render(
      <AppErrorBoundary>
        <BrokenPage />
      </AppErrorBoundary>
    );

    expect(screen.getByRole('alert').textContent).toContain('This page could not be displayed');
    expect(screen.getByRole('button', { name: 'Refresh page' })).toBeTruthy();
  });
});
