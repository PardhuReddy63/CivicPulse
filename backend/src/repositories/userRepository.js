const db = require('../config/db');

class UserRepository {
  async findById(userId) {
    const rows = await db.query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role, u.department_id, 
              u.active, u.verified, u.created_at, u.updated_at, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE u.user_id = ?`,
      [userId]
    );
    return rows[0] || null;
  }

  async findByEmail(email) {
    const rows = await db.query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role, u.department_id, 
              u.active, u.verified, u.created_at, u.updated_at, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE u.email = ?`,
      [email]
    );
    return rows[0] || null;
  }

  async create({ name, email, password_hash, role, department_id = null }) {
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, department_id, active, verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [name, email, password_hash, role, department_id]
    );
    return result.insertId;
  }

  async markVerified(userId) {
    await db.query(
      `UPDATE users SET verified = 1, updated_at = UTC_TIMESTAMP() WHERE user_id = ?`,
      [userId]
    );
  }

  async updatePassword(userId, newPasswordHash) {
    await db.query(
      `UPDATE users SET password_hash = ?, updated_at = UTC_TIMESTAMP() WHERE user_id = ?`,
      [newPasswordHash, userId]
    );
  }

  async listUsers({ page = 1, limit = 20, role = null, department_id = null }) {
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];

    if (role) {
      whereClause += ' AND u.role = ?';
      params.push(role);
    }
    if (department_id) {
      whereClause += ' AND u.department_id = ?';
      params.push(department_id);
    }

    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const dataRows = await db.query(
      `SELECT u.user_id, u.name, u.email, u.role, u.department_id, u.active, u.verified, u.created_at,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      users: dataRows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  async updateRoleAndDepartment(userId, role, departmentId = null) {
    await db.query(
      `UPDATE users SET role = ?, department_id = ?, updated_at = UTC_TIMESTAMP() WHERE user_id = ?`,
      [role, departmentId, userId]
    );
  }

  async setActiveStatus(userId, active) {
    await db.query(
      `UPDATE users SET active = ?, updated_at = UTC_TIMESTAMP() WHERE user_id = ?`,
      [active ? 1 : 0, userId]
    );
  }

  async listActiveOfficersByDepartment(departmentId = null) {
    let sql = `SELECT u.user_id, u.name, u.email, u.department_id, d.name AS department_name
               FROM users u
               LEFT JOIN departments d ON u.department_id = d.department_id
               WHERE u.role = 'OFFICER' AND u.active = 1 AND u.verified = 1`;
    const params = [];
    if (departmentId) {
      sql += ` AND u.department_id = ?`;
      params.push(departmentId);
    }
    sql += ` ORDER BY u.name ASC`;
    return await db.query(sql, params);
  }
}

module.exports = new UserRepository();
