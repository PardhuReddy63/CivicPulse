const config = require('../../src/config/env');
const authService = require('../../src/services/authService');
const { requireRole } = require('../../src/middleware/auth');
const userRepository = require('../../src/repositories/userRepository');
const auditRepository = require('../../src/repositories/auditRepository');
const bcrypt = require('bcryptjs');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Authentication and authorization configuration', () => {
  test('registration returns a clear setup error when SMTP is not configured', async () => {
    const previousSmtp = config.SMTP;
    config.SMTP = {
      host: '',
      port: 587,
      secure: false,
      user: '',
      password: '',
      from: '',
    };

    try {
      await expect(
        authService.register({ name: 'Test Citizen', email: 'citizen@example.test', password: 'long-password' })
      ).rejects.toMatchObject({ code: 'SMTP_NOT_CONFIGURED', status: 503 });
    } finally {
      config.SMTP = previousSmtp;
    }
  });

  test('role middleware rejects citizens from administrator-only routes', () => {
    const request = { user: { role: 'CITIZEN' } };
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireRole(['ADMIN'])(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('role middleware permits administrators on administrator-only routes', () => {
    const next = jest.fn();
    requireRole(['ADMIN'])({ user: { role: 'ADMIN' } }, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('login verifies the password and returns a signed JWT for an active verified user', async () => {
    const previousSecret = config.JWT_SECRET;
    config.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
    const passwordHash = await bcrypt.hash('correct-horse-battery', 4);
    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue({
      user_id: 7,
      name: 'Test Admin',
      email: 'admin@example.test',
      password_hash: passwordHash,
      role: 'ADMIN',
      department_id: null,
      department_name: null,
      active: true,
      verified: true,
    });
    jest.spyOn(auditRepository, 'log').mockResolvedValue(undefined);

    try {
      const result = await authService.login({
        email: 'admin@example.test',
        password: 'correct-horse-battery',
      });
      expect(jwtPayload(result.token)).toMatchObject({ user_id: 7, role: 'ADMIN' });
      expect(result.user).not.toHaveProperty('password_hash');
    } finally {
      config.JWT_SECRET = previousSecret;
    }
  });
});

function jwtPayload(token) {
  return require('jsonwebtoken').verify(token, config.JWT_SECRET);
}
