const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('../../src/config/env');
const userRepository = require('../../src/repositories/userRepository');
const complaintRepository = require('../../src/repositories/complaintRepository');
const { authenticate } = require('../../src/middleware/auth');
const upload = require('../../src/middleware/upload');
const complaintController = require('../../src/controllers/complaintController');
const request = require('supertest');
const app = require('../../src/app');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Evidence file security', () => {
  test('upload signature validation accepts a supported PNG image', async () => {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'civicpulse-upload-'));
    const filePath = path.join(directory, 'evidence_1_test.png');
    await fs.promises.writeFile(filePath, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const next = jest.fn();

    await upload.validateImageContents(
      { file: { path: filePath, mimetype: 'image/png' } },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith();
    await fs.promises.rm(directory, { recursive: true, force: true });
  });

  test('upload signature validation rejects and removes a MIME-spoofed file', async () => {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'civicpulse-upload-'));
    const filePath = path.join(directory, 'evidence_1_test.png');
    await fs.promises.writeFile(filePath, Buffer.from('<script>alert(1)</script>'));
    const next = jest.fn();

    await upload.validateImageContents(
      { file: { path: filePath, mimetype: 'image/png' } },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 415,
      code: 'INVALID_IMAGE_CONTENT',
    }));
    await expect(fs.promises.access(filePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await fs.promises.rm(directory, { recursive: true, force: true });
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
