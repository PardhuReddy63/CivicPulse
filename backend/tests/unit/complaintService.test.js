const db = require('../../src/config/db');
const complaintRepository = require('../../src/repositories/complaintRepository');
const feedbackRepository = require('../../src/repositories/feedbackRepository');
const auditRepository = require('../../src/repositories/auditRepository');
const userRepository = require('../../src/repositories/userRepository');
const complaintService = require('../../src/services/complaintService');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Complaint service database workflows', () => {
  test('creates a citizen complaint with supplied coordinates and records initial history', async () => {
    const transaction = {};
    const complaint = { complaint_id: 31, latitude: 12.34, longitude: 56.78, status: 'PENDING' };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(complaintRepository, 'create').mockResolvedValue(31);
    jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue(undefined);
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue(complaint);
    jest.spyOn(auditRepository, 'log').mockResolvedValue(undefined);

    const result = await complaintService.createComplaint({
      title: 'Street light outage',
      description: 'The light at the crossing is not working.',
      category: 'Street Lighting',
      location: 'Main Street crossing',
      latitude: 12.34,
      longitude: 56.78,
      user: { user_id: 8, role: 'CITIZEN' },
    });

    expect(complaintRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 12.34, longitude: 56.78, user_id: 8 }),
      transaction
    );
    expect(complaintRepository.addStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({ new_status: 'PENDING', old_status: null }),
      transaction
    );
    expect(result).toEqual(complaint);
  });

  test('reads complaint insertId from the MySQL transaction result tuple', async () => {
    const transaction = {
      query: jest.fn().mockResolvedValue([{ insertId: 47 }, []]),
    };

    const complaintId = await complaintRepository.create({
      title: 'Blocked storm drain',
      description: 'Water cannot drain from the crossing.',
      category: 'Water Works & Drainage',
      location: 'Main crossing',
      user_id: 8,
    }, transaction);

    expect(complaintId).toBe(47);
    expect(transaction.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO complaints'),
      expect.arrayContaining(['Blocked storm drain', 'Water Works & Drainage', 8])
    );
  });

  test('does not write history when no complaint ID was returned', async () => {
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback({}));
    jest.spyOn(complaintRepository, 'create').mockResolvedValue(undefined);
    const addHistory = jest.spyOn(complaintRepository, 'addStatusHistory');

    await expect(
      complaintService.createComplaint({
        title: 'Blocked storm drain',
        description: 'Water cannot drain from the crossing.',
        category: 'Water Works & Drainage',
        location: 'Main crossing',
        user: { user_id: 8, role: 'CITIZEN' },
      })
    ).rejects.toMatchObject({ code: 'COMPLAINT_ID_UNAVAILABLE', status: 500 });

    expect(addHistory).not.toHaveBeenCalled();
  });

  test('rejects complaint creation for non-citizen roles', async () => {
    const transaction = jest.spyOn(db, 'withTransaction');
    await expect(
      complaintService.createComplaint({
        title: 'Not permitted',
        user: { user_id: 3, role: 'OFFICER' },
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(transaction).not.toHaveBeenCalled();
  });

  test('rejects assignment when the grievance category has no active department', async () => {
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 31,
      category: 'Roads & Infrastructure',
      status: 'PENDING',
    });
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 12,
      name: 'Officer',
      role: 'OFFICER',
      active: 1,
      verified: 1,
      department_id: 4,
    });
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue(null);
    const transaction = jest.spyOn(db, 'withTransaction');

    await expect(
      complaintService.assignComplaint(31, {
        officer_id: 12,
        actor: { user_id: 1, role: 'ADMIN' },
      })
    ).rejects.toMatchObject({ code: 'DEPARTMENT_NOT_CONFIGURED', status: 409 });

    expect(transaction).not.toHaveBeenCalled();
  });

  test('rejects assignment to an officer from a different department', async () => {
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 31,
      category: 'Roads & Infrastructure',
      status: 'PENDING',
    });
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 12,
      name: 'Officer',
      role: 'OFFICER',
      active: 1,
      verified: 1,
      department_id: 9,
    });
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue({
      department_id: 4,
      name: 'Roads & Infrastructure',
    });
    const transaction = jest.spyOn(db, 'withTransaction');

    await expect(
      complaintService.assignComplaint(31, {
        officer_id: 12,
        actor: { user_id: 1, role: 'ADMIN' },
      })
    ).rejects.toMatchObject({ code: 'OFFICER_DEPARTMENT_MISMATCH', status: 400 });

    expect(transaction).not.toHaveBeenCalled();
  });

  test('assigns a verified officer from the matching department', async () => {
    const transaction = {};
    const pendingComplaint = {
      complaint_id: 31,
      category: 'Roads & Infrastructure',
      status: 'PENDING',
      priority: 'MEDIUM',
    };
    const assignedComplaint = { ...pendingComplaint, status: 'ASSIGNED', officer_id: 12 };
    jest.spyOn(complaintRepository, 'findById')
      .mockResolvedValueOnce(pendingComplaint)
      .mockResolvedValueOnce(assignedComplaint);
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 12,
      name: 'Verified Officer',
      role: 'OFFICER',
      active: 1,
      verified: 1,
      department_id: 4,
    });
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue({
      department_id: 4,
      name: 'Roads & Infrastructure',
    });
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    const assignOfficer = jest.spyOn(complaintRepository, 'assignOfficer').mockResolvedValue();
    jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue();
    jest.spyOn(auditRepository, 'log').mockResolvedValue();

    const result = await complaintService.assignComplaint(31, {
      officer_id: 12,
      priority: 'HIGH',
      deadline: '2026-08-10',
      actor: { user_id: 1, role: 'ADMIN' },
    });

    expect(assignOfficer).toHaveBeenCalledWith(
      31,
      { officer_id: 12, priority: 'HIGH', deadline: '2026-08-10' },
      transaction
    );
    expect(result).toEqual(assignedComplaint);
  });

  test('low feedback records history and reopens without clearing prior resolution fields', async () => {
    const transaction = {};
    const resolvedComplaint = {
      complaint_id: 31,
      user_id: 8,
      status: 'RESOLVED',
      resolution_cycle: 1,
      resolved_notes: 'Original repair completed.',
      resolved_image: '/uploads/after.jpg',
      resolved_by: 12,
      resolved_at: '2026-02-01 12:00:00',
    };
    const reopenedComplaint = { ...resolvedComplaint, status: 'PENDING', resolution_cycle: 2 };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest
      .spyOn(complaintRepository, 'findById')
      .mockResolvedValueOnce(resolvedComplaint)
      .mockResolvedValueOnce(reopenedComplaint);
    jest.spyOn(feedbackRepository, 'create').mockResolvedValue(45);
    jest.spyOn(complaintRepository, 'reopenToPending').mockResolvedValue(undefined);
    jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue(undefined);
    jest.spyOn(auditRepository, 'log').mockResolvedValue(undefined);

    const result = await complaintService.submitFeedback(31, {
      rating: 2,
      feedback_text: 'The repair did not last.',
      actor: { user_id: 8, role: 'CITIZEN' },
    });

    expect(feedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 2, resolution_cycle: 1 }),
      transaction
    );
    expect(complaintRepository.reopenToPending).toHaveBeenCalledWith(31, transaction);
    expect(complaintRepository.addStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({ old_status: 'RESOLVED', new_status: 'PENDING' }),
      transaction
    );
    expect(result).toMatchObject({ reopened: true, complaint: reopenedComplaint });
  });

  test('reopening SQL updates status and cycle while retaining resolution columns', async () => {
    const client = { query: jest.fn().mockResolvedValue(undefined) };
    await complaintRepository.reopenToPending(31, client);

    const [query, parameters] = client.query.mock.calls[0];
    expect(query).toMatch(/SET status = 'PENDING',\s*resolution_cycle = resolution_cycle \+ 1/i);
    expect(query).not.toMatch(/resolved_(?:notes|image|by|at)\s*=/i);
    expect(parameters).toEqual([31]);
  });
});
