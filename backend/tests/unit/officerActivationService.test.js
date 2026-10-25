const crypto = require('crypto');
const db = require('../../src/config/db');
const config = require('../../src/config/env');
const activationService = require('../../src/services/officerActivationService');
const activationRepository = require('../../src/repositories/officerActivationRepository');
const auditRepository = require('../../src/repositories/auditRepository');

describe('Officer activation service', () => {
  let client;

  beforeEach(() => {
    client = {
      query: jest.fn(),
    };

    jest.spyOn(db, 'withTransaction').mockImplementation(async (callback) => {
      return callback(client);
    });

    jest.spyOn(auditRepository, 'log').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('creates an activation link only for an approved application', async () => {
    client.query
      .mockResolvedValueOnce([
        {
          request_id: 12,
          full_name: 'Test Officer',
          email: 'officer@example.test',
          department_id: 2,
          status: 'APPROVED',
        },
      ])
      .mockResolvedValueOnce([]);

    const invalidate = jest
      .spyOn(activationRepository, 'invalidateUnusedTokens')
      .mockResolvedValue(undefined);

    const createToken = jest
      .spyOn(activationRepository, 'createToken')
      .mockResolvedValue(45);

    const result = await activationService.createActivationLink(12);

    expect(result.email).toBe('officer@example.test');
    expect(result.activationUrl).toContain('/officer/activate?token=');

    const rawToken = new URL(result.activationUrl).searchParams.get('token');
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);

    const expectedHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    expect(invalidate).toHaveBeenCalledWith(12, client);
    expect(createToken).toHaveBeenCalledWith(
      12,
      expectedHash,
      expect.any(Date),
      client
    );
    expect(db.withTransaction).toHaveBeenCalledTimes(1);
  });

  test('does not issue an activation link for a pending application', async () => {
    client.query.mockResolvedValueOnce([
      {
        request_id: 13,
        full_name: 'Pending Officer',
        email: 'pending@example.test',
        department_id: 2,
        status: 'PENDING',
      },
    ]);

    const createToken = jest.spyOn(
      activationRepository,
      'createToken'
    );

    await expect(activationService.createActivationLink(13))
      .rejects.toMatchObject({
        status: 409,
        code: 'APPLICATION_NOT_APPROVED',
      });

    expect(createToken).not.toHaveBeenCalled();
  });

  test('rejects an invalid or expired activation token', async () => {
    client.query.mockResolvedValueOnce([]);

    await expect(
      activationService.activateAccount({
        token: 'a'.repeat(64),
        password: 'a-secure-test-password',
      })
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_ACTIVATION_TOKEN',
    });

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(auditRepository.log).not.toHaveBeenCalled();
  });

  test('creates an active, verified officer account and consumes the token', async () => {
    client.query
      .mockResolvedValueOnce([
        { activation_id: 45, request_id: 12 },
      ])
      .mockResolvedValueOnce([
        {
          request_id: 12,
          full_name: 'Test Officer',
          email: 'officer@example.test',
          department_id: 2,
          status: 'APPROVED',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ insertId: 101 });

    const markUsed = jest
      .spyOn(activationRepository, 'markUsed')
      .mockImplementation(async (activationId, transactionClient) => {
        expect(activationId).toBe(45);
        expect(transactionClient).toBe(client);
        return true;
      });

    const result = await activationService.activateAccount({
      token: 'b'.repeat(64),
      password: 'a-secure-test-password',
    });

    expect(result.message).toMatch(/activated successfully/i);

    const insertCall = client.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO users')
    );

    expect(insertCall).toBeDefined();
    expect(insertCall[0]).toContain("'OFFICER'");
    expect(insertCall[0]).toContain('1, 1');
    expect(insertCall[1][0]).toBe('Test Officer');
    expect(insertCall[1][1]).toBe('officer@example.test');
    expect(insertCall[1][3]).toBe(2);

    expect(markUsed).toHaveBeenCalledTimes(1);
    expect(auditRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: 101,
        action: 'OFFICER_ACCOUNT_ACTIVATED',
      })
    );
    expect(db.withTransaction).toHaveBeenCalledTimes(1);
  });

  test('does not create an account when the email already has a user', async () => {
    client.query
      .mockResolvedValueOnce([
        { activation_id: 45, request_id: 12 },
      ])
      .mockResolvedValueOnce([
        {
          request_id: 12,
          full_name: 'Existing User',
          email: 'existing@example.test',
          department_id: 2,
          status: 'APPROVED',
        },
      ])
      .mockResolvedValueOnce([{ user_id: 88 }]);

    const markUsed = jest.spyOn(activationRepository, 'markUsed');

    await expect(
      activationService.activateAccount({
        token: 'c'.repeat(64),
        password: 'a-secure-test-password',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'ACCOUNT_ALREADY_EXISTS',
    });

    expect(
      client.query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO users')
      )
    ).toBe(false);
    expect(markUsed).not.toHaveBeenCalled();
    expect(auditRepository.log).not.toHaveBeenCalled();
  });
});
