
const db = require('../config/db');
const auditRepository = require('./auditRepository');

class OfficerRegistrationRepository {
  async findExistingUserByEmail(email) {
    const rows = await db.query(
      `SELECT user_id
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [email]
    );

    return rows[0] || null;
  }

  async findByEmail(email) {
    const rows = await db.query(
      `SELECT request_id, status
       FROM officer_registration_requests
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [email]
    );

    return rows[0] || null;
  }

  async create({
    full_name,
    email,
    phone,
    department_id,
    designation,
    reason,
  }) {
    const result = await db.query(
      `INSERT INTO officer_registration_requests
        (full_name, email, phone, department_id, designation, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        full_name,
        email,
        phone,
        department_id,
        designation,
        reason,
      ]
    );

    return result.insertId;
  }

  async listApplications({ status = null, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countRows = await db.query(
      `SELECT COUNT(*) AS total
       FROM officer_registration_requests r
       ${whereClause}`,
      params
    );

    const applications = await db.query(
      `SELECT
         r.request_id,
         r.full_name,
         r.email,
         r.phone,
         r.department_id,
         d.name AS department_name,
         r.designation,
         r.reason,
         r.status,
         r.reviewed_by,
         r.reviewed_at,
         r.review_notes,
         r.created_at,
         r.updated_at,
         u.name AS reviewer_name
       FROM officer_registration_requests r
       INNER JOIN departments d
         ON d.department_id = r.department_id
       LEFT JOIN users u
         ON u.user_id = r.reviewed_by
       ${whereClause}
       ORDER BY
         CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END,
         r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const total = Number(countRows[0]?.total || 0);

    return {
      applications,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(requestId) {
    const rows = await db.query(
      `SELECT request_id, full_name, email, status
       FROM officer_registration_requests
       WHERE request_id = ?
       LIMIT 1`,
      [requestId]
    );

    return rows[0] || null;
  }

  async reviewPendingApplication({
    requestId,
    status,
    reviewerId,
    reviewNotes = null,
  }) {
    return db.withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE officer_registration_requests
         SET status = ?,
             reviewed_by = ?,
             reviewed_at = UTC_TIMESTAMP(),
             review_notes = ?
         WHERE request_id = ?
           AND status = 'PENDING'`,
        [status, reviewerId, reviewNotes, requestId]
      );

      if (result.affectedRows !== 1) {
        return { updated: false };
      }

      const rows = await client.query(
        `SELECT request_id, full_name, email, status, reviewed_by,
                reviewed_at, review_notes
         FROM officer_registration_requests
         WHERE request_id = ?
         LIMIT 1`,
        [requestId]
      );

      const application = rows[0];

      await auditRepository.log({
        actor_user_id: reviewerId,
        action: status === 'APPROVED'
          ? 'OFFICER_APPLICATION_APPROVED'
          : 'OFFICER_APPLICATION_REJECTED',
        entity_type: 'officer_registration_request',
        entity_id: requestId,
        details_json: {
          email: application.email,
          status,
          review_notes: application.review_notes,
        },
        client,
      });

      return {
        updated: true,
        application,
      };
    });
  }
}

module.exports = new OfficerRegistrationRepository();
