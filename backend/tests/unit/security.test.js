const path = require('path');
const { PassThrough, Readable } = require('stream');
const jwt = require('jsonwebtoken');
const config = require('../../src/config/env');
const userRepository = require('../../src/repositories/userRepository');
const complaintRepository = require('../../src/repositories/complaintRepository');
const feedbackRepository = require('../../src/repositories/feedbackRepository');
const resolutionVerificationRepository = require('../../src/repositories/resolutionVerificationRepository');
const { authenticate } = require('../../src/middleware/auth');
const upload = require('../../src/middleware/upload');
const evidenceStorage = require('../../src/services/evidenceStorage');
const complaintController = require('../../src/controllers/complaintController');
const request = require('supertest');
const app = require('../../src/app');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Evidence file security', () => {
  test('upload signature validation accepts a supported PNG image', async () => {
    const next = jest.fn();

    await upload.validateImageContents(
      { file: { buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), mimetype: 'image/png' } },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  test('upload signature validation rejects a MIME-spoofed file', async () => {
    const next = jest.fn();

    await upload.validateImageContents(
      { file: { buffer: Buffer.from('<script>alert(1)</script>'), mimetype: 'image/png' } },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 415,
      code: 'INVALID_IMAGE_CONTENT',
    }));
  });

  test('complaint evidence requires complaint access and serves from the configured upload root', async () => {
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 5,
      user_id: 8,
      officer_id: 12,
      image: '/uploads/evidence_1_test.jpg',
      resolved_image: null,
    });
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      sendFile: jest.fn(),
      headersSent: false,
    };
    const next = jest.fn();

    await complaintController.getEvidence(
      { params: { complaintId: '5', type: 'BEFORE' }, user: { user_id: 9, role: 'CITIZEN' } },
      res,
      next
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.sendFile).not.toHaveBeenCalled();

    await complaintController.getEvidence(
      { params: { complaintId: '5', type: 'BEFORE' }, user: { user_id: 8, role: 'CITIZEN' } },
      res,
      next
    );
    expect(res.sendFile).toHaveBeenCalledWith(
      'evidence_1_test.jpg',
      expect.objectContaining({
        root: path.resolve(config.UPLOAD_DIR),
        headers: expect.objectContaining({ 'Cache-Control': 'private, no-store' }),
      }),
      expect.any(Function)
    );
  });

  test('citizens cannot fetch resolution evidence before administrator approval', async () => {
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 5,
      user_id: 8,
      officer_id: 12,
      status: 'RESOLUTION_PENDING_REVIEW',
      resolved_image: 'supabase://complaint-evidence/evidence/after.jpg',
    });
    const downloadEvidence = jest.spyOn(evidenceStorage, 'downloadEvidence');
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      sendFile: jest.fn(),
      headersSent: false,
    };

    await complaintController.getEvidence(
      { params: { complaintId: '5', type: 'AFTER' }, user: { user_id: 8, role: 'CITIZEN' } },
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.sendFile).not.toHaveBeenCalled();
    expect(downloadEvidence).not.toHaveBeenCalled();
  });

  test('authorized callers stream private Supabase evidence through the API', async () => {
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 5,
      user_id: 8,
      officer_id: 12,
      status: 'AWAITING_CITIZEN',
      image: 'supabase://complaint-evidence/evidence/before.jpg',
      resolved_image: 'supabase://complaint-evidence/evidence/after.jpg',
    });
    const downloadEvidence = jest.spyOn(evidenceStorage, 'downloadEvidence')
      .mockResolvedValue({
        stream: Readable.from([Buffer.from('private image')]),
        contentType: 'image/jpeg',
      });
    const res = new PassThrough();
    const headers = {};
    res.set = jest.fn((values) => {
      Object.assign(headers, values);
      return res;
    });
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve, reject) => {
      res.once('finish', resolve);
      res.once('error', reject);
    });

    await complaintController.getEvidence(
      { params: { complaintId: '5', type: 'AFTER' }, user: { user_id: 8, role: 'CITIZEN' } },
      res,
      jest.fn()
    );
    await finished;

    expect(downloadEvidence).toHaveBeenCalledWith(
      'supabase://complaint-evidence/evidence/after.jpg'
    );
    expect(headers).toMatchObject({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    expect(Buffer.concat(chunks).toString()).toBe('private image');
  });

  test('citizens cannot download private evidence for another complaint owner', async () => {
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 5,
      user_id: 8,
      image: 'supabase://complaint-evidence/evidence/before.jpg',
    });
    const downloadEvidence = jest.spyOn(evidenceStorage, 'downloadEvidence');
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await complaintController.getEvidence(
      { params: { complaintId: '5', type: 'BEFORE' }, user: { user_id: 9, role: 'CITIZEN' } },
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(downloadEvidence).not.toHaveBeenCalled();
  });

  test('citizen detail and timeline responses hide unapproved notes, paths, and review reasons', async () => {
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 5,
      user_id: 8,
      officer_id: 12,
      status: 'RESOLUTION_PENDING_REVIEW',
      resolved_image: '/uploads/private-after.jpg',
      resolved_notes: 'Private unapproved work notes.',
      resolved_by: 12,
      resolved_by_name: 'Officer',
      resolved_at: '2026-06-01 12:00:00',
    });
    jest.spyOn(complaintRepository, 'getAttachments').mockResolvedValue([
      { attachment_type: 'BEFORE', file_path: '/uploads/before.jpg' },
      { attachment_type: 'AFTER', file_path: '/uploads/private-after.jpg' },
    ]);
    jest.spyOn(feedbackRepository, 'findByComplaintId').mockResolvedValue([]);
    jest.spyOn(resolutionVerificationRepository, 'findByComplaintId').mockResolvedValue([]);
    jest.spyOn(complaintRepository, 'getStatusHistory').mockResolvedValue([
      { new_status: 'ASSIGNED', reason: 'Assigned to officer.' },
      { new_status: 'RESOLUTION_PENDING_REVIEW', reason: 'Private unapproved work notes.' },
    ]);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const req = { params: { complaintId: '5' }, user: { user_id: 8, role: 'CITIZEN' } };

    await complaintController.getComplaintById(req, res, jest.fn());
    const detail = res.json.mock.calls[0][0].data;
    expect(detail.resolved_image).toBeNull();
    expect(detail.resolved_notes).toBeNull();
    expect(detail.attachments).toEqual([{ attachment_type: 'BEFORE', file_path: '/uploads/before.jpg' }]);

    await complaintController.getComplaintHistory(req, res, jest.fn());
    expect(res.json.mock.calls[1][0].data).toEqual([
      { new_status: 'ASSIGNED', reason: 'Assigned to officer.' },
    ]);
  });

  test('legacy public uploads path no longer serves evidence', async () => {
    const response = await request(app).get('/uploads/evidence-that-does-not-exist.jpg');
    expect(response.status).toBe(404);
  });
});

describe('Authentication infrastructure errors', () => {
  test('database failures are forwarded instead of reported as invalid tokens', async () => {
    const previousSecret = config.JWT_SECRET;
    config.JWT_SECRET = 'unit-test-secret-with-at-least-32-characters';
    const databaseError = new Error('Database unavailable');
    jest.spyOn(userRepository, 'findById').mockRejectedValue(databaseError);
    const req = {
      headers: { authorization: `Bearer ${jwt.sign({ user_id: 8 }, config.JWT_SECRET)}` },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    try {
      await authenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(databaseError);
      expect(res.status).not.toHaveBeenCalled();
    } finally {
      config.JWT_SECRET = previousSecret;
    }
  });
});
