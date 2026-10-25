const db = require('../../src/config/db');
const auditRepository = require('../../src/repositories/auditRepository');
const complaintRepository = require('../../src/repositories/complaintRepository');
const complaintController = require('../../src/controllers/complaintController');
const userRepository = require('../../src/repositories/userRepository');
const complaintService = require('../../src/services/complaintService');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Education grievance assignment and officer retrieval', () => {
  test('Education grievance 5 can be assigned to Giri and retrieved only by Giri', async () => {
    const educationOfficer = {
      user_id: 3,
      name: 'Giri',
      role: 'OFFICER',
      active: 1,
      verified: 1,
      department_id: 5,
    };
    let storedGrievance = null;
    const transaction = {
      query: jest.fn(async (sql, params = []) => {
        if (sql.includes('INSERT INTO complaints')) {
          const [title, description, category, sub_category, location, latitude, longitude, image, priority, user_id] = params;
          storedGrievance = {
            complaint_id: 5,
            title,
            description,
            category,
            sub_category,
            location,
            latitude,
            longitude,
            image,
            priority,
            user_id,
            status: 'PENDING',
            officer_id: null,
          };
          return { insertId: 5, affectedRows: 1 };
        }
        if (sql.includes('UPDATE complaints')) {
          const [officer_id, priority, deadline] = params;
          storedGrievance = {
            ...storedGrievance,
            status: 'ASSIGNED',
            officer_id,
            priority,
            deadline,
          };
          return { affectedRows: 1 };
        }
        if (sql.includes('SELECT c.*')) {
          return storedGrievance ? [storedGrievance] : [];
        }
        return { insertId: 601, affectedRows: 1 };
      }),
    };

    jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
    jest.spyOn(auditRepository, 'log').mockResolvedValue();
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue(null);
    jest.spyOn(complaintRepository, 'findLeastLoadedOfficerId').mockResolvedValue(null);
    const databaseQuery = jest.spyOn(db, 'query').mockImplementation(async (sql, params = []) => {
      if (sql.includes('COUNT(*)')) {
        if (sql.includes('c.officer_id = ?')) {
          return [{ total: storedGrievance?.officer_id === Number(params[0]) ? 1 : 0 }];
        }
        return [{ total: storedGrievance?.status === params[0] && storedGrievance?.category === params[1] ? 1 : 0 }];
      }
      if (sql.includes('WHERE c.complaint_id = ?')) {
        return storedGrievance ? [storedGrievance] : [];
      }
      if (sql.includes('WHERE c.officer_id = ?')) {
        return storedGrievance?.officer_id === Number(params[0]) ? [storedGrievance] : [];
      }
      return storedGrievance ? [storedGrievance] : [];
    });

    const created = await complaintService.createComplaint({
      title: 'Damaged classroom roof',
      description: 'The classroom roof is damaged and leaks during rainfall.',
      category: 'Education',
      sub_category: 'School Building Damage',
      location: 'Education campus, North Ward',
      latitude: 12.345678,
      longitude: 77.123456,
      user: { user_id: 8, role: 'CITIZEN' },
    });

    expect(created).toMatchObject({ status: 'PENDING', officer_id: null });
    expect(storedGrievance).toMatchObject({
      complaint_id: 5,
      category: 'Education',
      sub_category: 'School Building Damage',
      status: 'PENDING',
      officer_id: null,
    });

    const adminQueue = await complaintRepository.listAll({
      status: 'PENDING',
      category: 'Education',
    });
    expect(adminQueue.complaints).toContainEqual(expect.objectContaining({
      complaint_id: 5,
      category: 'Education',
      status: 'PENDING',
      officer_id: null,
    }));

    jest.spyOn(userRepository, 'findById').mockResolvedValue(educationOfficer);
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue({
      department_id: educationOfficer.department_id,
      name: 'Education',
    });

    const assigned = await complaintService.assignComplaint(5, {
      officer_id: educationOfficer.user_id,
      priority: 'HIGH',
      deadline: '2026-11-01',
      actor: { user_id: 1, role: 'ADMIN' },
    });

    expect(assigned).toMatchObject({ status: 'ASSIGNED', officer_id: educationOfficer.user_id });
    expect(userRepository.findDepartmentByName).toHaveBeenCalledWith('Education');
    const assignmentQuery = transaction.query.mock.calls.find(([sql]) => sql.includes('UPDATE complaints'));
    expect(assignmentQuery[1]).toEqual(expect.arrayContaining([educationOfficer.user_id, 5]));

    const educationWork = await complaintRepository.listByOfficer(educationOfficer.user_id, {});
    const otherDepartmentWork = await complaintRepository.listByOfficer(32, {});

    expect(storedGrievance).toMatchObject({
      status: 'ASSIGNED',
      officer_id: educationOfficer.user_id,
      priority: 'HIGH',
      deadline: '2026-11-01',
    });
    expect(educationWork.complaints).toEqual([storedGrievance]);
    expect(otherDepartmentWork.complaints).toEqual([]);
    expect(databaseQuery.mock.calls.filter(([sql]) => sql.includes('c.officer_id = ?')).length).toBe(4);
    expect(databaseQuery.mock.calls.filter(([sql]) => sql.includes('c.officer_id = ?')).map(([, params]) => params[0]))
      .toEqual([3, 3, 32, 32]);
  });

  test('rejects assigning an Education grievance to an officer in another department', async () => {
    jest.spyOn(complaintRepository, 'findById').mockResolvedValue({
      complaint_id: 501,
      category: 'Education',
      status: 'PENDING',
    });
    jest.spyOn(userRepository, 'findById').mockResolvedValue({
      user_id: 32,
      role: 'OFFICER',
      active: 1,
      verified: 1,
      department_id: 8,
    });
    jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue({
      department_id: 7,
      name: 'Education',
    });
    const withTransaction = jest.spyOn(db, 'withTransaction');

    await expect(
      complaintService.assignComplaint(501, {
        officer_id: 32,
        actor: { user_id: 1, role: 'ADMIN' },
      })
    ).rejects.toMatchObject({
      code: 'OFFICER_DEPARTMENT_MISMATCH',
      status: 400,
    });
    expect(withTransaction).not.toHaveBeenCalled();
  });

  test.each([
    {
      complaintId: 601,
      category: 'Public Works',
      officer: { user_id: 41, name: 'Public Works Officer', department_id: 11 },
    },
    {
      complaintId: 602,
      category: 'Health Services',
      officer: { user_id: 42, name: 'Health Officer', department_id: 12 },
    },
  ])(
    'assigns and retrieves $category grievances only for officer $officer.user_id',
    async ({ complaintId, category, officer }) => {
      const pending = {
        complaint_id: complaintId,
        category,
        status: 'PENDING',
        officer_id: null,
        priority: 'MEDIUM',
      };
      let persisted = { ...pending };
      const transaction = {
        query: jest.fn(async (sql, params = []) => {
          if (sql.includes('UPDATE complaints')) {
            const [officer_id, priority, deadline] = params;
            persisted = { ...persisted, status: 'ASSIGNED', officer_id, priority, deadline };
            return { affectedRows: 1 };
          }
          return [];
        }),
      };
      const findById = jest.spyOn(complaintRepository, 'findById')
        .mockResolvedValueOnce(pending)
        .mockImplementation(async (id, client) => {
          expect(id).toBe(complaintId);
          if (client) expect(client).toBe(transaction);
          return persisted;
        });
      jest.spyOn(userRepository, 'findById').mockResolvedValue({
        ...officer,
        role: 'OFFICER',
        active: 1,
        verified: 1,
      });
      jest.spyOn(userRepository, 'findDepartmentByName').mockResolvedValue({
        department_id: officer.department_id,
        name: category,
      });
      jest.spyOn(db, 'withTransaction').mockImplementation((callback) => callback(transaction));
      jest.spyOn(complaintRepository, 'addStatusHistory').mockResolvedValue();
      jest.spyOn(auditRepository, 'log').mockResolvedValue();
      jest.spyOn(db, 'query').mockImplementation(async (sql, params = []) => {
        const rows = persisted.officer_id === Number(params[0]) ? [persisted] : [];
        return sql.includes('COUNT(*)') ? [{ total: rows.length }] : rows;
      });

      const assigned = await complaintService.assignComplaint(complaintId, {
        officer_id: officer.user_id,
        priority: 'HIGH',
        deadline: '2026-11-05',
        actor: { user_id: 1, role: 'ADMIN' },
      });
      expect(assigned).toMatchObject({
        complaint_id: complaintId,
        category,
        status: 'ASSIGNED',
        officer_id: officer.user_id,
      });
      expect(findById).toHaveBeenNthCalledWith(2, complaintId, transaction, { forUpdate: true });

      const response = {
        status: jest.fn(() => response),
        json: jest.fn(),
      };
      await complaintController.listAssignedComplaints(
        { user: { user_id: officer.user_id, role: 'OFFICER' }, query: {} },
        response,
        jest.fn()
      );
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [persisted],
      }));

      const otherOfficerResponse = {
        status: jest.fn(() => otherOfficerResponse),
        json: jest.fn(),
      };
      await complaintController.listAssignedComplaints(
        { user: { user_id: officer.user_id + 1, role: 'OFFICER' }, query: {} },
        otherOfficerResponse,
        jest.fn()
      );
      expect(otherOfficerResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [],
      }));
    }
  );

  test('assigned complaints endpoint scopes its query to the authenticated officer ID', async () => {
    const assigned = {
      complaint_id: 5,
      category: 'Education',
      sub_category: 'School Building Damage',
      status: 'ASSIGNED',
      officer_id: 3,
    };
    const listByOfficer = jest.spyOn(complaintRepository, 'listByOfficer').mockResolvedValue({
      complaints: [assigned],
      page: 1,
      limit: 20,
      total: 1,
      total_pages: 1,
    });
    const response = {
      status: jest.fn(() => response),
      json: jest.fn(),
    };

    await complaintController.listAssignedComplaints(
      { user: { user_id: 3, role: 'OFFICER' }, query: {} },
      response,
      jest.fn()
    );

    expect(listByOfficer).toHaveBeenCalledWith(3, {
      page: 1,
      limit: 20,
      status: undefined,
    });
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      data: [assigned],
    }));
  });
});
