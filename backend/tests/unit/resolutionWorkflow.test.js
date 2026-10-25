const db = require('../../src/config/db');
const auditRepository = require('../../src/repositories/auditRepository');
const complaintRepository = require('../../src/repositories/complaintRepository');
const resolutionVerificationRepository = require('../../src/repositories/resolutionVerificationRepository');
const userRepository = require('../../src/repositories/userRepository');
const complaintService = require('../../src/services/complaintService');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('automatic assignment and resolution workflow', () => {
  test('stores the citizen decision against its grievance, citizen, and resolution cycle', async () => {
    const transaction = {
      query: jest.fn().mockResolvedValue({ insertId: 91 }),
    };

    await expect(resolutionVerificationRepository.create({
      complaint_id: 88,
      resolution_cycle: 3,
      citizen_id: 9,
      decision: 'NOT_RESOLVED',
      feedback_text: 'The water is still leaking.',
    }, transaction)).resolves.toBe(91);

    expect(transaction.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO complaint_resolution_verifications'),
      [88, 3, 9, 'NOT_RESOLVED', 'The water is still leaking.']
    );
    expect(transaction.query.mock.calls[0][0]).toContain('UTC_TIMESTAMP()');
  });

  test.each([
    { category: 'Education', department_id: 5, officer_id: 31 },
    { category: 'Public Works', department_id: 2, officer_id: 42 },
  ])('automatically assigns a new $category grievance in the creation transaction', async ({
    category,
    department_id,
    officer_id,
  }) => {
    const transaction = {};
    const savedComplaint = {
      complaint_id: 71,
      category,
      status: 'ASSIGNED',
      officer_id,
    };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(complaintRepository, 'create').mockResolvedValue(71);
    jest.spyOn(complaintRepository, 'assignOfficer').mockResolvedValue(undefined);
    jest.spyOn(complaintRepository, 'findLeastLoadedOfficerId').mockResolvedValue(officer_id);
    jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue(undefined);
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue(savedComplaint);
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue({
      department_id,
      name: category,
    });
    const auditLog = jest.spyOn(auditRepository, 'log').mockResolvedValue(undefined);

    const result = await complaintService.createComplaint({
      title: 'Department service issue',
      description: 'The reported civic service issue requires a department response.',
      category,
      location: 'Central Ward',
      user: { user_id: 9, role: 'CITIZEN' },
    });

    expect(complaintRepository.assignOfficer).toHaveBeenCalledWith(
      71,
      { officer_id },
      transaction
    );
    expect(complaintRepository.addStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({ new_status: 'ASSIGNED' }),
      transaction
    );
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'COMPLAINT_AUTO_ASSIGNED',
      details_json: expect.objectContaining({ officer_id, department_id }),
      client: transaction,
    }));
    expect(result).toMatchObject({ status: 'ASSIGNED', officer_id });
  });

  test('keeps a grievance pending and records assignment unavailability when no eligible officer exists', async () => {
    const transaction = {};
    const pendingComplaint = { complaint_id: 72, category: 'Education', status: 'PENDING', officer_id: null };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(complaintRepository, 'create').mockResolvedValue(72);
    const assignOfficer = jest.spyOn(complaintRepository, 'assignOfficer');
    jest.spyOn(complaintRepository, 'findLeastLoadedOfficerId').mockResolvedValue(null);
    jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue(undefined);
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue(pendingComplaint);
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue({
      department_id: 5,
      name: 'Education',
    });
    const auditLog = jest.spyOn(auditRepository, 'log').mockResolvedValue(undefined);

    const result = await complaintService.createComplaint({
      title: 'Department service issue',
      description: 'The reported civic service issue requires a department response.',
      category: 'Education',
      location: 'Central Ward',
      user: { user_id: 9, role: 'CITIZEN' },
    });

    expect(assignOfficer).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'COMPLAINT_ASSIGNMENT_UNAVAILABLE',
      entity_id: 72,
      client: transaction,
    }));
    expect(result).toMatchObject({ status: 'PENDING', officer_id: null });
  });

  test.each([
    {
      departmentId: 5,
      officers: [3, 7, 11],
      workload: [3, 7, 7],
      expected: 3,
    },
    {
      departmentId: 8,
      officers: [20, 21, 22],
      workload: [4, 1, 1],
      expected: 21,
    },
  ])('selects the least-loaded officer for department $departmentId with a stable ID tie-break', async ({
    departmentId,
    officers,
    workload,
    expected,
  }) => {
    const assignments = officers.flatMap((officerId, index) =>
      Array.from({ length: workload[index] }, () => ({ officer_id: officerId }))
    );
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce(officers.map((user_id) => ({ user_id })))
        .mockResolvedValueOnce(assignments),
    };

    await expect(
      complaintRepository.findLeastLoadedOfficerId(departmentId, client)
    ).resolves.toBe(expected);
    expect(client.query.mock.calls[0][0]).toContain('active = 1');
    expect(client.query.mock.calls[0][0]).toContain('verified = 1');
    expect(client.query.mock.calls[0][0]).toMatch(/ORDER BY user_id ASC\s+FOR UPDATE/);
    expect(client.query.mock.calls[0][1]).toEqual([departmentId]);
    expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(client.query.mock.calls[1][0]).toContain('RESOLUTION_PENDING_REVIEW');
  });

  test('requires the assigned officer and a photo before submitting resolution evidence', async () => {
    const transaction = {};
    const complaint = { complaint_id: 73, officer_id: 14, status: 'ASSIGNED' };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue(complaint);
    const submitResolution = jest.spyOn(complaintRepository, 'submitResolution');
    jest.spyOn(complaintRepository, 'addAttachment').mockResolvedValue(1);
    jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue(undefined);
    jest.spyOn(auditRepository, 'log').mockResolvedValue(undefined);

    await expect(complaintService.resolveComplaint(73, {
      resolved_notes: 'The reported damage has been repaired and checked.',
      after_file: { filename: 'after.jpg', mimetype: 'image/jpeg' },
      actor: { user_id: 99, role: 'OFFICER' },
    })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    await expect(complaintService.resolveComplaint(73, {
      resolved_notes: 'The reported damage has been repaired and checked.',
      actor: { user_id: 14, role: 'OFFICER' },
    })).rejects.toMatchObject({ code: 'RESOLUTION_PHOTO_REQUIRED', status: 400 });
    expect(submitResolution).not.toHaveBeenCalled();
  });

  test.each([
    { previousStatus: 'ASSIGNED', reason: 'Assigned officer started investigating the grievance.' },
    { previousStatus: 'RESOLUTION_REJECTED', reason: 'Assigned officer started the requested resolution revisions.' },
  ])('assigned officer can start work from $previousStatus with an audit trail', async ({
    previousStatus,
    reason,
  }) => {
    const transaction = {};
    const complaint = {
      complaint_id: 75,
      officer_id: 14,
      status: previousStatus,
    };
    const updated = { ...complaint, status: 'IN_PROGRESS' };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    const findById = jest.spyOn(complaintRepository, 'findById')
      .mockResolvedValueOnce(complaint)
      .mockResolvedValueOnce(updated);
    const setStatus = jest.spyOn(complaintRepository, 'setStatus').mockResolvedValue();
    const addStatusHistory = jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue();
    const auditLog = jest.spyOn(auditRepository, 'log').mockResolvedValue();

    await expect(complaintService.startWork(75, {
      user_id: 14,
      role: 'OFFICER',
    })).resolves.toEqual(updated);

    expect(findById).toHaveBeenNthCalledWith(1, 75, transaction, { forUpdate: true });
    expect(setStatus).toHaveBeenCalledWith(75, 'IN_PROGRESS', transaction);
    expect(addStatusHistory).toHaveBeenCalledWith(expect.objectContaining({
      old_status: previousStatus,
      new_status: 'IN_PROGRESS',
      reason,
    }), transaction);
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'COMPLAINT_WORK_STARTED',
      entity_id: 75,
      client: transaction,
    }));
  });

  test('does not let another officer start work on an assigned grievance', async () => {
    const transaction = {};
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 76,
      officer_id: 14,
      status: 'ASSIGNED',
    });
    const setStatus = jest.spyOn(complaintRepository, 'setStatus');

    await expect(complaintService.startWork(76, {
      user_id: 15,
      role: 'OFFICER',
    })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    expect(setStatus).not.toHaveBeenCalled();
  });

  test('persists officer notes and after-photo before sending evidence to admin review', async () => {
    const transaction = {};
    const complaint = { complaint_id: 77, officer_id: 14, status: 'ASSIGNED' };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue(complaint);
    const submitResolution = jest.spyOn(complaintRepository, 'submitResolution').mockResolvedValue();
    const addAttachment = jest.spyOn(complaintRepository, 'addAttachment').mockResolvedValue(1);
    const addHistory = jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue();
    const auditLog = jest.spyOn(auditRepository, 'log').mockResolvedValue();

    await complaintService.resolveComplaint(77, {
      resolved_notes: 'The damaged school roof was repaired and inspected.',
      after_file: { filename: 'after-school.webp', mimetype: 'image/webp' },
      actor: { user_id: 14, role: 'OFFICER' },
    });

    expect(submitResolution).toHaveBeenCalledWith(77, {
      resolved_by: 14,
      resolved_notes: 'The damaged school roof was repaired and inspected.',
      resolved_image: '/uploads/after-school.webp',
    }, transaction);
    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({
      attachment_type: 'AFTER',
      file_path: '/uploads/after-school.webp',
      uploaded_by: 14,
    }), transaction);
    expect(addHistory).toHaveBeenCalledWith(expect.objectContaining({
      old_status: 'ASSIGNED',
      new_status: 'RESOLUTION_PENDING_REVIEW',
    }), transaction);
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'RESOLUTION_SUBMITTED_FOR_REVIEW',
      client: transaction,
    }));
  });

  test.each([
    { decision: 'APPROVE', expectedStatus: 'AWAITING_CITIZEN' },
    { decision: 'REJECT', expectedStatus: 'RESOLUTION_REJECTED' },
  ])('admin $decision review is audited and records the right next state', async ({
    decision,
    expectedStatus,
  }) => {
    const transaction = {};
    const complaint = { complaint_id: 74, status: 'RESOLUTION_PENDING_REVIEW', officer_id: 14 };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue(complaint);
    const updateStatus = jest.spyOn(complaintRepository, 'setStatus').mockResolvedValue();
    const addHistory = jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue();
    const auditLog = jest.spyOn(auditRepository, 'log').mockResolvedValue();

    const result = await complaintService.reviewResolution(74, {
      decision,
      rejection_reason: decision === 'REJECT' ? 'Please attach a clearer repair photograph.' : '',
      actor: { user_id: 1, role: 'ADMIN' },
    });

    expect(updateStatus).toHaveBeenCalledWith(74, expectedStatus, transaction);
    expect(addHistory).toHaveBeenCalledWith(expect.objectContaining({
      old_status: 'RESOLUTION_PENDING_REVIEW',
      new_status: expectedStatus,
    }), transaction);
    expect(auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: decision === 'APPROVE' ? 'RESOLUTION_APPROVED' : 'RESOLUTION_REJECTED',
      client: transaction,
    }));
    expect(result).toEqual(complaint);
  });

  test('only admins may review evidence and rejected evidence requires a reason', async () => {
    const withTransaction = jest.spyOn(db, 'withTransaction');
    await expect(complaintService.reviewResolution(78, {
      decision: 'APPROVE',
      actor: { user_id: 14, role: 'OFFICER' },
    })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    await expect(complaintService.reviewResolution(78, {
      decision: 'REJECT',
      rejection_reason: '  ',
      actor: { user_id: 1, role: 'ADMIN' },
    })).rejects.toMatchObject({ code: 'REJECTION_REASON_REQUIRED', status: 400 });
    expect(withTransaction).not.toHaveBeenCalled();
  });

  test('prevents the submitting officer from reviewing their own resolution', async () => {
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback({}));
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 79,
      status: 'RESOLUTION_PENDING_REVIEW',
      resolved_by: 14,
    });
    const updateStatus = jest.spyOn(complaintRepository, 'setStatus');

    await expect(complaintService.reviewResolution(79, {
      decision: 'APPROVE',
      actor: { user_id: 14, role: 'ADMIN' },
    })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(updateStatus).not.toHaveBeenCalled();
  });

  test.each([
    { decision: 'RESOLVED', expectedStatus: 'RESOLVED', owner: 9 },
    { decision: 'NOT_RESOLVED', expectedStatus: 'ASSIGNED', owner: 9 },
  ])('citizen $decision verification is stored separately from satisfaction ratings', async ({
    decision,
    expectedStatus,
    owner,
  }) => {
    const transaction = {};
    const complaint = {
      complaint_id: 75,
      user_id: owner,
      status: 'AWAITING_CITIZEN',
      resolution_cycle: 2,
    };
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue(complaint);
    jest.spyOn(resolutionVerificationRepository, 'hasVerificationForCycle').mockResolvedValue(false);
    const createVerification = jest.spyOn(resolutionVerificationRepository, 'create').mockResolvedValue(1);
    const updateStatus = jest.spyOn(complaintRepository, 'verifyResolution').mockResolvedValue();
    const addHistory = jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue();
    const auditLog = jest.spyOn(auditRepository, 'log').mockResolvedValue();

    await complaintService.verifyResolution(75, {
      decision,
      feedback_text: 'The citizen response has optional supporting details.',
      actor: { user_id: owner, role: 'CITIZEN' },
    });

    expect(createVerification).toHaveBeenCalledWith({
      complaint_id: 75,
      resolution_cycle: 2,
      citizen_id: owner,
      decision,
      feedback_text: 'The citizen response has optional supporting details.',
    }, transaction);
    expect(updateStatus).toHaveBeenCalledWith(75, decision === 'RESOLVED', transaction);
    expect(addHistory).toHaveBeenCalledWith(expect.objectContaining({
      old_status: 'AWAITING_CITIZEN',
      new_status: expectedStatus,
    }), transaction);
    expect(auditLog).toHaveBeenCalled();
  });

  test('rejects another citizen and duplicate verification before changing state', async () => {
    const transaction = {};
    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 76,
      user_id: 9,
      status: 'AWAITING_CITIZEN',
      resolution_cycle: 1,
    });
    const hasVerification = jest.spyOn(resolutionVerificationRepository, 'hasVerificationForCycle');
    const createVerification = jest.spyOn(resolutionVerificationRepository, 'create');
    const updateStatus = jest.spyOn(complaintRepository, 'verifyResolution');

    await expect(complaintService.verifyResolution(76, {
      decision: 'RESOLVED',
      actor: { user_id: 10, role: 'CITIZEN' },
    })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(hasVerification).not.toHaveBeenCalled();

    hasVerification.mockResolvedValue(true);
    await expect(complaintService.verifyResolution(76, {
      decision: 'RESOLVED',
      actor: { user_id: 9, role: 'CITIZEN' },
    })).rejects.toMatchObject({ code: 'DUPLICATE_VERIFICATION', status: 409 });
    expect(createVerification).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
  });
});
