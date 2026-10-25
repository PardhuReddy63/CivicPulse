// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/apiClient', () => ({
  ApiClient: {
    clearToken: vi.fn(),
    login: vi.fn(),
    listComplaints: vi.fn().mockRejectedValue(new Error('API unavailable')),
    listDepartments: vi.fn().mockRejectedValue(new Error('API unavailable')),
    setToken: vi.fn(),
  },
}));

import { ApiClient } from '../../src/services/apiClient';
import { store } from '../../src/services/store';

afterEach(() => {
  store.logout();
  vi.resetAllMocks();
});

describe('store authentication', () => {
  it('keeps a valid login when dashboard data endpoints are unavailable', async () => {
    const user = {
      user_id: 5,
      name: 'Test Citizen',
      email: 'citizen@example.test',
      role: 'CITIZEN',
    };
    ApiClient.login.mockResolvedValue({
      data: { token: 'valid-session-token', user },
    });

    await expect(store.login(user.email, 'password')).resolves.toEqual(user);

    expect(ApiClient.setToken).toHaveBeenCalledWith('valid-session-token');
    expect(store.getCurrentUser()).toEqual(user);
  });
});
