const db = require('../../src/config/db');
const userRepository = require('../../src/repositories/userRepository');
const auditRepository = require('../../src/repositories/auditRepository');
const userController = require('../../src/controllers/userController');

function createResponse() {
  const response = {
    status: jest.fn(() => response),
    json: jest.fn(),
  };
  return response;
}

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Admin user role management', () => {
  test('requires an active department before granting the officer role', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 12,
      verified: 1,
    });
    const updateRole = jest.spyOn(userRepository, 'updateRoleAndDepartment');
    const response = createResponse();

    await userController.updateRole(
      {
        params: { userId: '12' },
        body: { role: 'OFFICER' },
        user: { user_id: 1 },
      },
      response,
      jest.fn()
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'DEPARTMENT_REQUIRED' }),
      })
    );
    expect(updateRole).not.toHaveBeenCalled();
  });

  test('rejects an inactive department for officer assignment', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 12,
      verified: 1,
    });
    jest.spyOn(db, 'query').mockResolvedValue([]);
    const updateRole = jest.spyOn(userRepository, 'updateRoleAndDepartment');
    const response = createResponse();

    await userController.updateRole(
      {
        params: { userId: '12' },
        body: { role: 'OFFICER', department_id: 4 },
        user: { user_id: 1 },
      },
      response,
      jest.fn()
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_DEPARTMENT' }),
      })
    );
    expect(updateRole).not.toHaveBeenCalled();
  });

  test('does not grant staff roles to unverified accounts', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 12,
      verified: 0,
    });
    const updateRole = jest.spyOn(userRepository, 'updateRoleAndDepartment');
    const response = createResponse();

    await userController.updateRole(
      {
        params: { userId: '12' },
        body: { role: 'ADMIN' },
        user: { user_id: 1 },
      },
      response,
      jest.fn()
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(updateRole).not.toHaveBeenCalled();
  });

  test('persists and audits the validated officer department', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 12,
      verified: 1,
    });
    jest.spyOn(db, 'query').mockResolvedValue([{ department_id: 4 }]);
    const updateRole = jest.spyOn(userRepository, 'updateRoleAndDepartment').mockResolvedValue();
    jest.spyOn(auditRepository, 'log').mockResolvedValue();
    const response = createResponse();

    await userController.updateRole(
      {
        params: { userId: '12' },
        body: { role: 'OFFICER', department_id: 4 },
        user: { user_id: 1 },
      },
      response,
      jest.fn()
    );

    expect(updateRole).toHaveBeenCalledWith(12, 'OFFICER', 4);
    expect(auditRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        details_json: { new_role: 'OFFICER', department_id: 4 },
      })
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
