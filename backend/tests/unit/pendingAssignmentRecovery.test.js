const db = require('../../src/config/db');
const complaintRepository = require('../../src/repositories/complaintRepository');
const userRepository = require('../../src/repositories/userRepository');
const auditRepository = require('../../src/repositories/auditRepository');
const complaintService = require('../../src/services/complaintService');

describe('Pending grievance assignment recovery', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('assigns an older pending grievance to an eligible department officer', async () => {
    const client = { query: jest.fn() };

    jest.spyOn(db, 'withTransaction')
      .mockImplementation(async (callback) => callback(client));

    jest.spyOn(complaintRepository, 'findPendingUnassigned')
      .mockResolvedValue([
        {
          complaint_id: 5,
          category: 'Education',
          status: 'PENDING',
          officer_id: null,
        },
      ]);

    jest.spyOn(userRepository, 'findDepartmentByName')
      .mockResolvedValue({ department_id: 5, name: 'Education' });

    jest.spyOn(complaintRepository, 'findLeastLoadedOfficerId')
      .mockResolvedValue(3);

    const assignOfficer = jest.spyOn(complaintRepository, 'assignOfficer')
      .mockResolvedValue({
        affectedRows: 1,
      });

    const addStatusHistory = jest.spyOn(complaintRepository, 'addStatusHistory')
      .mockResolvedValue(undefined);

    const auditLog = jest.spyOn(auditRepository, 'log')
      .mockResolvedValue(undefined);

    const result = await complaintService.recoverPendingAssignments();

    expect(result).toMatchObject({
      processed: 1,
      assigned: 1,
      assignments: [{ complaint_id: 5, officer_id: 3 }],
    });

    expect(assignOfficer).toHaveBeenCalledWith(
      5,
      { officer_id: 3 },
      client
    );

    expect(addStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        complaint_id: 5,
        old_status: 'PENDING',
        new_status: 'ASSIGNED',
      }),
      client
    );

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMPLAINT_AUTO_ASSIGNED',
        entity_id: 5,
        client,
      })
    );
  });

  test('leaves pending grievances unassigned when no eligible officer exists', async () => {
    const client = { query: jest.fn() };

    jest.spyOn(db, 'withTransaction')
      .mockImplementation(async (callback) => callback(client));

    jest.spyOn(complaintRepository, 'findPendingUnassigned')
      .mockResolvedValue([
        {
          complaint_id: 5,
          category: 'Education',
          status: 'PENDING',
          officer_id: null,
        },
      ]);

    jest.spyOn(userRepository, 'findDepartmentByName')
      .mockResolvedValue({ department_id: 5, name: 'Education' });

    jest.spyOn(complaintRepository, 'findLeastLoadedOfficerId')
      .mockResolvedValue(null);

    const assignOfficer = jest.spyOn(complaintRepository, 'assignOfficer');
    const addStatusHistory = jest.spyOn(complaintRepository, 'addStatusHistory');
    const auditLog = jest.spyOn(auditRepository, 'log');

    const result = await complaintService.recoverPendingAssignments();

    expect(result).toMatchObject({
      processed: 1,
      assigned: 0,
      assignments: [],
    });

    expect(assignOfficer).not.toHaveBeenCalled();
    expect(addStatusHistory).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  test('skips history and audit when the guarded assignment updates no rows', async () => {
    const client = { query: jest.fn() };

    jest.spyOn(db, 'withTransaction')
      .mockImplementation(async (callback) => callback(client));

    jest.spyOn(complaintRepository, 'findPendingUnassigned')
      .mockResolvedValue([
        {
          complaint_id: 5,
          category: 'Education',
          status: 'PENDING',
          officer_id: null,
        },
      ]);

    jest.spyOn(userRepository, 'findDepartmentByName')
      .mockResolvedValue({ department_id: 5, name: 'Education' });

    jest.spyOn(complaintRepository, 'findLeastLoadedOfficerId')
      .mockResolvedValue(3);

    jest.spyOn(complaintRepository, 'assignOfficer')
      .mockResolvedValue({ affectedRows: 0 });

    const addStatusHistory = jest.spyOn(complaintRepository, 'addStatusHistory')
      .mockResolvedValue(undefined);
    const auditLog = jest.spyOn(auditRepository, 'log')
      .mockResolvedValue(undefined);

    const result = await complaintService.recoverPendingAssignments();

    expect(result).toMatchObject({
      processed: 1,
      assigned: 0,
      assignments: [],
    });
    expect(complaintRepository.addStatusHistory).not.toHaveBeenCalled();
    expect(auditRepository.log).not.toHaveBeenCalled();
  });
});
