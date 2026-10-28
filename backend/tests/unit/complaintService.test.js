const db = require('../../src/config/db');
const complaintRepository = require('../../src/repositories/complaintRepository');
const feedbackRepository = require('../../src/repositories/feedbackRepository');
const auditRepository = require('../../src/repositories/auditRepository');
const userRepository = require('../../src/repositories/userRepository');
const complaintService = require('../../src/services/complaintService');
const evidenceStorage = require('../../src/services/evidenceStorage');

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
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue(null);
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

  test('creates a complaint with photo, attachment, and initial history in one transaction', async () => {
    const storedEvidencePath =
      'supabase://complaint-evidence/evidence/test-photo.jpg';
    jest.spyOn(evidenceStorage, 'uploadEvidence')
      .mockResolvedValue(storedEvidencePath);
    const transaction = {
      query: jest.fn()
        .mockResolvedValueOnce({ insertId: 31, affectedRows: 1 })
        .mockResolvedValueOnce({ insertId: 32, affectedRows: 1 })
        .mockResolvedValueOnce({ insertId: 33, affectedRows: 1 })
        .mockResolvedValueOnce({ insertId: 34, affectedRows: 1 }),
    };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue(null);
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 31,
      category: 'Education',
      sub_category: 'School Building Damage',
      status: 'PENDING',
    });

    const result = await complaintService.createComplaint({
      title: 'Damaged classroom roof',
      description: 'Roof panels are damaged and leak during rainfall.',
      category: 'Education',
      sub_category: 'School Building Damage',
      location: 'School entrance, North Ward',
      latitude: 12.345678,
      longitude: 77.123456,
      image_file: {
        buffer: Buffer.from([0xff, 0xd8, 0xff]),
        mimetype: 'image/jpeg',
      },
      user: { user_id: 8, role: 'CITIZEN' },
    });

    expect(transaction.query).toHaveBeenCalledTimes(5);
    expect(transaction.query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining([
      expect.stringContaining('INSERT INTO complaints'),
      expect.stringContaining('INSERT INTO complaint_attachments'),
      expect.stringContaining('INSERT INTO complaint_status_history'),
      expect.stringContaining('INSERT INTO audit_logs'),
    ]));
    expect(transaction.query.mock.calls[0][1]).toContain(storedEvidencePath);
    expect(result).toMatchObject({ complaint_id: 31, category: 'Education' });
  });

  test('reads complaint insertId from the transaction adapter result', async () => {
    const transaction = {
      query: jest.fn().mockResolvedValue({ insertId: 47, affectedRows: 1 }),
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

  test('supports raw MySQL transaction result tuples', async () => {
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

  test('reads feedback insertId from the transaction adapter result', async () => {
    const transaction = {
      query: jest.fn().mockResolvedValue({ insertId: 52, affectedRows: 1 }),
    };

    const feedbackId = await feedbackRepository.create({
      complaint_id: 31,
      citizen_id: 8,
      rating: 4,
      feedback_text: 'The repair resolved the problem.',
    }, transaction);

    expect(feedbackId).toBe(52);
    expect(transaction.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO complaint_feedback'),
      expect.arrayContaining([31, 8, 4])
    );
  });

  test('writes complaint status history through the transaction adapter', async () => {
    const transaction = {
      query: jest.fn().mockResolvedValue({ insertId: 61, affectedRows: 1 }),
    };

    const historyId = await complaintRepository.addStatusHistory({
      complaint_id: 31,
      changed_by: 8,
      old_status: null,
      new_status: 'PENDING',
      reason: 'Citizen lodged grievance',
    }, transaction);

    expect(historyId).toBe(61);
    expect(transaction.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO complaint_status_history'),
      [31, 8, null, 'PENDING', 'Citizen lodged grievance']
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

  test('removes uploaded evidence if the complaint transaction fails', async () => {
    const storedPath = 'supabase://complaint-evidence/evidence/failed-create.jpg';
    jest.spyOn(evidenceStorage, 'uploadEvidence').mockResolvedValue(storedPath);
    const removeEvidence = jest.spyOn(evidenceStorage, 'deleteEvidence').mockResolvedValue();
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback({}));
    jest.spyOn(complaintRepository, 'create').mockResolvedValue(undefined);

    await expect(complaintService.createComplaint({
      title: 'Blocked storm drain',
      description: 'Water cannot drain from the crossing.',
      category: 'Water Works & Drainage',
      location: 'Main crossing',
      image_file: {
        buffer: Buffer.from([0xff, 0xd8, 0xff]),
        mimetype: 'image/jpeg',
      },
      user: { user_id: 8, role: 'CITIZEN' },
    })).rejects.toMatchObject({ code: 'COMPLAINT_ID_UNAVAILABLE' });

    expect(removeEvidence).toHaveBeenCalledWith(storedPath);
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
    const assignedComplaint = {
      ...pendingComplaint,
      status: 'ASSIGNED',
      officer_id: 12,
      priority: 'HIGH',
      deadline: '2026-08-10',
    };
    const findById = jest.spyOn(complaintRepository, 'findById')
      .mockResolvedValueOnce(pendingComplaint)
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
    expect(findById).toHaveBeenNthCalledWith(2, 31, transaction, { forUpdate: true });
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
    const reopenedComplaint = { ...resolvedComplaint, status: 'ASSIGNED', resolution_cycle: 2 };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest
      .spyOn(complaintRepository, 'findById')
      .mockResolvedValueOnce(resolvedComplaint)
      .mockResolvedValueOnce(reopenedComplaint);
    jest.spyOn(feedbackRepository, 'create').mockResolvedValue(45);
    jest.spyOn(feedbackRepository, 'hasFeedbackForCycle').mockResolvedValue(false);
    jest.spyOn(complaintRepository, 'reopenToAssigned').mockResolvedValue(undefined);
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
    expect(complaintRepository.reopenToAssigned).toHaveBeenCalledWith(31, transaction);
    expect(complaintRepository.addStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({ old_status: 'RESOLVED', new_status: 'ASSIGNED' }),
      transaction
    );
    expect(result).toMatchObject({ reopened: true, complaint: reopenedComplaint });
  });

  test('reopening SQL returns the grievance to its officer and retains resolution columns', async () => {
    const client = { query: jest.fn().mockResolvedValue(undefined) };
    await complaintRepository.reopenToAssigned(31, client);

    const [query, parameters] = client.query.mock.calls[0];
    expect(query).toMatch(/SET status = 'ASSIGNED',\s*resolution_cycle = resolution_cycle \+ 1/i);
    expect(query).not.toMatch(/resolved_(?:notes|image|by|at)\s*=/i);
    expect(parameters).toEqual([31]);
  });
});
