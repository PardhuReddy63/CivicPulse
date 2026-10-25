const config = require('../../src/config/env');
const authService = require('../../src/services/authService');
const { requireRole } = require('../../src/middleware/auth');
const userRepository = require('../../src/repositories/userRepository');
const auditRepository = require('../../src/repositories/auditRepository');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../../src/app');

const originalConfig = {
  DB: config.DB,
  JWT_SECRET: config.JWT_SECRET,
  NODE_ENV: config.NODE_ENV,
  SMTP: config.SMTP,
};

beforeEach(() => {
  config.SMTP = {
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: '',
  };
});

afterEach(() => {
  config.DB = originalConfig.DB;
  config.JWT_SECRET = originalConfig.JWT_SECRET;
  config.NODE_ENV = originalConfig.NODE_ENV;
  config.SMTP = originalConfig.SMTP;
  jest.restoreAllMocks();
});

describe('Authentication and authorization configuration', () => {
  test('startup validation allows development mode with no SMTP credentials', () => {
    config.NODE_ENV = 'development';
    config.DB = { host: 'localhost', port: 3306, database: 'civicpulse_test', user: 'test', password: '' };
    config.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
    config.SMTP = {
      host: '',
      port: 465,
      secure: true,
      user: '',
      password: '',
      from: '',
    };

    expect(() => config.validateEnvironment()).not.toThrow();
  });

  test('startup validation allows partially configured SMTP in development', () => {
    config.NODE_ENV = 'development';
    config.DB = { host: 'localhost', port: 3306, database: 'civicpulse_test', user: 'test', password: '' };
    config.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
    config.SMTP = {
      host: 'smtp.example.test',
      port: 587,
      secure: false,
      user: '',
      password: '',
      from: '',
    };

    expect(() => config.validateEnvironment()).not.toThrow();
  });

  test('startup validation rejects missing SMTP credentials in production', () => {
    config.NODE_ENV = 'production';
    config.DB = { host: 'localhost', port: 3306, database: 'civicpulse_test', user: 'test', password: '' };
    config.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

    expect(() => config.validateEnvironment()).toThrow(/SMTP is required in production/);
  });

  test('registration returns a clear setup error when SMTP is not configured', async () => {
    await expect(
      authService.register({ name: 'Test Citizen', email: 'citizen@example.test', password: 'long-password' })
    ).rejects.toMatchObject({ code: 'SMTP_NOT_CONFIGURED', status: 503 });
  });

  test.each([
    ['/auth/register', { name: 'Test Citizen', email: 'citizen@example.test', password: 'long-password' }],
    ['/auth/resend-otp', { email: 'citizen@example.test' }],
    ['/auth/forgot-password', { email: 'citizen@example.test' }],
  ])('%s returns HTTP 503 when email delivery is not configured', async (endpoint, body) => {
    const response = await request(app).post(`/api/v1${endpoint}`).send(body);

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'SMTP_NOT_CONFIGURED',
        message: expect.stringContaining('Email delivery is not configured'),
      },
    });
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

  test('login accepts an identifier, verifies the password, and returns a signed JWT without a forced-change flag', async () => {
    const previousSecret = config.JWT_SECRET;
    config.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
    const passwordHash = await bcrypt.hash('correct-horse-battery', 4);
    jest.spyOn(userRepository, 'findByIdentifier').mockResolvedValue({
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
        identifier: 'admin-identifier-test',
        password: 'correct-horse-battery',
      });
      expect(userRepository.findByIdentifier).toHaveBeenCalledWith('admin-identifier-test');
      expect(jwtPayload(result.token)).toMatchObject({ user_id: 7, role: 'ADMIN' });
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).not.toHaveProperty('must_change_password');
    } finally {
      config.JWT_SECRET = previousSecret;
    }
  });

  test('voluntary password change verifies the current password, stores a new hash, and audits it', async () => {
    const currentHash = await bcrypt.hash('current-password-123', 4);
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 9,
      role: 'ADMIN',
      password_hash: currentHash,
    });
    const updatePassword = jest.spyOn(userRepository, 'updatePassword').mockResolvedValue(undefined);
    const audit = jest.spyOn(auditRepository, 'log').mockResolvedValue(undefined);

    const result = await authService.changePassword(
      9,
      'current-password-123',
      'a-new-secure-password'
    );

    expect(result.message).toMatch(/updated successfully/);
    expect(updatePassword).toHaveBeenCalledWith(
      9,
      expect.any(String)
    );
    expect(await bcrypt.compare('a-new-secure-password', updatePassword.mock.calls[0][1])).toBe(true);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      actor_user_id: 9,
      action: 'PASSWORD_CHANGED',
    }));
  });

  test('voluntary password change rejects an incorrect current password', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 4,
      password_hash: await bcrypt.hash('actual-password', 4),
    });
    const updatePassword = jest.spyOn(userRepository, 'updatePassword');

    await expect(authService.changePassword(4, 'wrong-password', 'a-new-secure-password'))
      .rejects.toMatchObject({ status: 400, code: 'CURRENT_PASSWORD_INCORRECT' });
    expect(updatePassword).not.toHaveBeenCalled();
  });

  test('voluntary password change rejects reusing the current password', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 4,
      password_hash: await bcrypt.hash('same-password', 4),
    });
    const updatePassword = jest.spyOn(userRepository, 'updatePassword');

    await expect(authService.changePassword(4, 'same-password', 'same-password'))
      .rejects.toMatchObject({ status: 400, code: 'PASSWORD_UNCHANGED' });
    expect(updatePassword).not.toHaveBeenCalled();
  });
});

function jwtPayload(token) {
  return require('jsonwebtoken').verify(token, config.JWT_SECRET);
}
