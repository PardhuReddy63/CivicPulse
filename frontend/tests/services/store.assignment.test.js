// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/apiClient', () => ({
  ApiClient: {
    assignComplaint: vi.fn(),
    clearToken: vi.fn(),
    listComplaints: vi.fn(),
    listDepartments: vi.fn(),
    listUsers: vi.fn(),
    listOfficerWorkload: vi.fn(),
    listAuditLogs: vi.fn(),
  },
}));

import { ApiClient } from '../../src/services/apiClient';
import { store } from '../../src/services/store';

afterEach(() => {
  store.logout();
  vi.resetAllMocks();
});

describe('store assigned grievance refresh', () => {
  it.each([
    {
      department: 'Education',
      adminId: 1,
      officerId: 3,
      complaintId: 5,
    },
    {
      department: 'Health Services',
      adminId: 1,
      officerId: 12,
      complaintId: 19,
    },
  ])(
    'retains an assigned $department grievance for officer $officerId after dashboard refresh',
    async ({ department, adminId, officerId, complaintId }) => {
      const assignedComplaint = {
        complaint_id: complaintId,
        category: department,
        status: 'ASSIGNED',
        officer_id: officerId,
      };

      ApiClient.assignComplaint.mockResolvedValue({
        success: true,
        data: assignedComplaint,
      });
      ApiClient.listComplaints.mockImplementation(async (role) => ({
        success: true,
        data: role === 'OFFICER' ? [assignedComplaint] : [],
      }));
      ApiClient.listDepartments.mockResolvedValue({ data: [] });
      ApiClient.listUsers.mockResolvedValue({ data: [] });
      ApiClient.listOfficerWorkload.mockResolvedValue({ data: [] });
      ApiClient.listAuditLogs.mockResolvedValue({ data: [] });

      store.setCurrentUser({ user_id: adminId, role: 'ADMIN' });
      await store.assignComplaint(complaintId, officerId, 'HIGH', '2026-11-05');

      expect(ApiClient.assignComplaint).toHaveBeenCalledWith(complaintId, {
        officer_id: officerId,
        priority: 'HIGH',
        deadline: '2026-11-05',
      });

      store.setCurrentUser({
        user_id: officerId,
        role: 'OFFICER',
        department_name: department,
      });
      await store.refreshComplaints();

      expect(ApiClient.listComplaints).toHaveBeenLastCalledWith('OFFICER');
      expect(store.getComplaints()).toEqual([assignedComplaint]);
    }
  );
});
