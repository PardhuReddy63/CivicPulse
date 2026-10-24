const db = require('../config/db');

class AuditRepository {
  async log({ actor_user_id = null, action, entity_type, entity_id = null, details_json = null, client = null }) {
    const executor = client || db;
    const detailsStr = details_json ? JSON.stringify(details_json) : null;
    await executor.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details_json, created_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [actor_user_id, action, entity_type, entity_id, detailsStr]
    );
  }

  async listLogs({ page = 1, limit = 50, entity_type = null, entity_id = null }) {
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];

    if (entity_type) {
      whereClause += ' AND a.entity_type = ?';
      params.push(entity_type);
    }
    if (entity_id) {
      whereClause += ' AND a.entity_id = ?';
      params.push(entity_id);
    }

    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM audit_logs a WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const logs = await db.query(
      `SELECT a.audit_id, a.actor_user_id, a.action, a.entity_type, a.entity_id, 
              a.details_json, a.created_at, u.name as actor_name, u.role as actor_role
       FROM audit_logs a
       LEFT JOIN users u ON a.actor_user_id = u.user_id
       WHERE ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      logs,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }
}

module.exports = new AuditRepository();
