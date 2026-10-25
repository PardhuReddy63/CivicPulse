const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');
const db = require('../config/db');

class UserController {
  async listAuditLogs(req, res, next) {
    try {
      const result = await auditRepository.listLogs({
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 50, 100),
      });
      res.status(200).json({
        success: true,
        data: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: result.total_pages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async listUsers(req, res, next) {
    try {
      const { page, limit, role, department_id } = req.query;
      const result = await userRepository.listUsers({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        role,
        department_id: department_id ? parseInt(department_id, 10) : null,
      });

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: result.total_pages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req, res, next) {
    try {
      const userId = parseInt(req.params.userId, 10);
      const { role, department_id } = req.body;

      if (!['CITIZEN', 'OFFICER', 'ADMIN'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ROLE', message: 'Role must be CITIZEN, OFFICER, or ADMIN.' },
        });
      }

      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
        });
      }
      if (userId === req.user.user_id && role !== 'ADMIN') {
        return res.status(400).json({
          success: false,
          error: { code: 'CANNOT_CHANGE_OWN_ROLE', message: 'You cannot remove your own administrator role.' },
        });
      }
      if (role !== 'CITIZEN' && !existingUser.verified) {
        return res.status(409).json({
          success: false,
          error: { code: 'USER_NOT_VERIFIED', message: 'Verify the account before granting a staff role.' },
        });
      }

      let departmentId = null;
      if (role === 'OFFICER') {
        departmentId = Number(department_id);
        if (!Number.isSafeInteger(departmentId) || departmentId < 1) {
          return res.status(400).json({
            success: false,
            error: { code: 'DEPARTMENT_REQUIRED', message: 'Select an active department for the officer.' },
          });
        }
        const departments = await db.query(
          'SELECT department_id FROM departments WHERE department_id = ? AND active = 1',
          [departmentId]
        );
        if (departments.length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_DEPARTMENT', message: 'Select an active department.' },
          });
        }
      }

      await userRepository.updateRoleAndDepartment(userId, role, departmentId);

      await auditRepository.log({
        actor_user_id: req.user.user_id,
        action: 'USER_ROLE_UPDATED',
        entity_type: 'USER',
        entity_id: userId,
        details_json: { new_role: role, department_id: departmentId },
      });

      const updated = await userRepository.findById(userId);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async setActiveStatus(req, res, next) {
    try {
      const userId = parseInt(req.params.userId, 10);
      const { active } = req.body;

      if (typeof active !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Active state must be a boolean.' },
        });
      }

      // Guard: do not allow admin to deactivate own account
      if (req.user.user_id === userId && !active) {
        return res.status(400).json({
          success: false,
          error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'You cannot deactivate your own administrative account.' },
        });
      }

      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
        });
      }

      await userRepository.setActiveStatus(userId, active);

      await auditRepository.log({
        actor_user_id: req.user.user_id,
        action: active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity_type: 'USER',
        entity_id: userId,
      });

      const updated = await userRepository.findById(userId);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async listOfficers(req, res, next) {
    try {
      const { department_id } = req.query;
      const officers = await userRepository.listActiveOfficersByDepartment(
        department_id ? parseInt(department_id, 10) : null
      );
      res.status(200).json({
        success: true,
        data: officers,
      });
    } catch (err) {
      next(err);
    }
  }

  async listDepartments(req, res, next) {
    try {
      const departments = await db.query(
        `SELECT department_id, name, active FROM departments WHERE active = 1 ORDER BY name ASC`
      );
      res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
