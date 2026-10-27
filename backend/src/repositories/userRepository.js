
const db = require('../config/db');

class UserRepository {
  async findByIdentifier(identifier) {
    const normalizedIdentifier = String(identifier || '').trim();

    if (!normalizedIdentifier) {
      return null;
    }

    // "admin" is an alias for an existing ADMIN account, not a new account.
    // Never return a citizen or officer through this alias.
    if (normalizedIdentifier.toLowerCase() === 'admin') {
      const rows = await db.query(
        `SELECT u.user_id, u.name, u.email, u.password_hash, u.role,
                u.department_id, u.active, u.verified, u.created_at,
                u.updated_at, d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.department_id
         WHERE u.role = 'ADMIN'
         ORDER BY u.user_id ASC
         LIMIT 1`
      );

      return rows[0] || null;
    }

    const rows = await db.query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role,
              u.department_id, u.active, u.verified, u.created_at,
              u.updated_at, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE LOWER(u.email) = LOWER(?)`,
      [normalizedIdentifier]
    );

    return rows[0] || null;
  }

  async findDepartmentByName(name, client = db) {
    const rows = await client.query(
      `SELECT department_id, name
       FROM departments
       WHERE name = ? AND active = TRUE`,
      [name]
    );
    return rows[0] || null;
  }

  async findById(userId, client = db, { forUpdate = false } = {}) {
    const rows = await client.query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role,
              u.department_id, u.active, u.verified, u.created_at,
              u.updated_at, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE u.user_id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
      [userId]
    );
    return rows[0] || null;
  }

  async findByEmail(email) {
    const rows = await db.query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role,
              u.department_id, u.active, u.verified, u.created_at,
              u.updated_at, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE u.email = ?`,
      [email]
    );
    return rows[0] || null;
  }

  async create({ name, email, password_hash, role, department_id = null }) {
    const result = await db.query(
      `INSERT INTO users
        (name, email, password_hash, role, department_id, active, verified,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING user_id`,
      [name, email, password_hash, role, department_id]
    );
    return result.insertId;
  }

  async markVerified(userId) {
    await db.query(
      `UPDATE users
       SET verified = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [userId]
    );
  }

  async updatePassword(userId, newPasswordHash) {
    await db.query(
      `UPDATE users
       SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
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
      `SELECT COUNT(*) AS total FROM users u WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const dataRows = await db.query(
      `SELECT u.user_id, u.name, u.email, u.role, u.department_id,
              u.active, u.verified, u.created_at,
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
      `UPDATE users
       SET role = ?, department_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [role, departmentId, userId]
    );
  }

  async setActiveStatus(userId, active) {
    await db.query(
      `UPDATE users
       SET active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [Boolean(active), userId]
    );
  }

  async listActiveOfficersByDepartment(departmentId = null) {
    let sql = `SELECT u.user_id, u.name, u.email, u.department_id,
                      d.name AS department_name
               FROM users u
               LEFT JOIN departments d ON u.department_id = d.department_id
               WHERE u.role = 'OFFICER'
                 AND u.active = TRUE
                 AND u.verified = TRUE`;

    const params = [];

    if (departmentId) {
      sql += ' AND u.department_id = ?';
      params.push(departmentId);
    }

    sql += ' ORDER BY u.name ASC';
    return db.query(sql, params);
  }
}

module.exports = new UserRepository();
