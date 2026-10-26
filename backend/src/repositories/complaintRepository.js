const db = require('../config/db');

async function executeInsert(executor, sql, params) {
  const queryResult = await executor.query(sql, params);
  return Array.isArray(queryResult) ? queryResult[0] : queryResult;
}

class ComplaintRepository {
  async findById(complaintId, client = null, { forUpdate = false } = {}) {
    const executor = client || db;
    const rows = await executor.query(
      `SELECT c.*,
              u.name AS citizen_name, u.email AS citizen_email,
              o.name AS officer_name, o.email AS officer_email,
              r.name AS resolved_by_name,
              d.name AS officer_department_name
       FROM complaints c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users o ON c.officer_id = o.user_id
       LEFT JOIN users r ON c.resolved_by = r.user_id
       LEFT JOIN departments d ON o.department_id = d.department_id
       WHERE c.complaint_id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
      [complaintId]
    );
    return rows[0] || null;
  }


  async findPendingUnassigned(client, limit = 100) {
    return await client.query(
      `SELECT c.*
       FROM complaints c
       WHERE c.status = 'PENDING'
         AND c.officer_id IS NULL
       ORDER BY c.created_at ASC, c.complaint_id ASC
       LIMIT ?
       FOR UPDATE`,
      [limit]
    );
  }


  async findLeastLoadedOfficerId(departmentId, client) {
    const candidates = await client.query(
      `SELECT user_id
       FROM users
       WHERE department_id = ?
         AND role = 'OFFICER'
         AND active = 1
         AND verified = 1
       ORDER BY user_id ASC
       FOR UPDATE`,
      [departmentId]
    );
    if (candidates.length === 0) return null;

    const officerIds = candidates.map((officer) => officer.user_id);
    const placeholders = officerIds.map(() => '?').join(', ');
    const activeAssignments = await client.query(
      `SELECT officer_id
       FROM complaints
       WHERE officer_id IN (${placeholders})
         AND status IN (
           'ASSIGNED',
           'IN_PROGRESS',
           'RESOLUTION_REJECTED',
           'RESOLUTION_PENDING_REVIEW',
           'AWAITING_CITIZEN'
         )
       FOR UPDATE`,
      officerIds
    );
    const workloadByOfficer = new Map(officerIds.map((officerId) => [Number(officerId), 0]));
    activeAssignments.forEach(({ officer_id }) => {
      workloadByOfficer.set(
        Number(officer_id),
        (workloadByOfficer.get(Number(officer_id)) || 0) + 1
      );
    });

    return officerIds
      .map(Number)
      .sort((left, right) =>
        workloadByOfficer.get(left) - workloadByOfficer.get(right) || left - right
      )[0] || null;
  }

  async listAll({ page = 1, limit = 20, status = null, priority = null, category = null, search = null }) {
    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }
    if (priority) {
      whereClause += ' AND c.priority = ?';
      params.push(priority);
    }
    if (category) {
      whereClause += ' AND c.category = ?';
      params.push(category);
    }
    if (search) {
      whereClause += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.location LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM complaints c WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const complaints = await db.query(
      `SELECT c.*,
              u.name AS citizen_name,
              o.name AS officer_name,
              d.name AS officer_department_name,
              (SELECT rating FROM complaint_feedback f WHERE f.complaint_id = c.complaint_id ORDER BY f.created_at DESC LIMIT 1) AS citizen_rating,
              (SELECT feedback_text FROM complaint_feedback f WHERE f.complaint_id = c.complaint_id ORDER BY f.created_at DESC LIMIT 1) AS citizen_feedback
       FROM complaints c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users o ON c.officer_id = o.user_id
       LEFT JOIN departments d ON o.department_id = d.department_id
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      complaints,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  async listByCitizen(userId, { page = 1, limit = 20, status = null }) {
    const offset = (page - 1) * limit;
    let whereClause = 'c.user_id = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM complaints c WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const complaints = await db.query(
      `SELECT c.*,
              o.name AS officer_name,
              (SELECT rating FROM complaint_feedback f
               WHERE f.complaint_id = c.complaint_id
                 AND f.resolution_cycle = c.resolution_cycle
               ORDER BY f.created_at DESC LIMIT 1) AS citizen_rating,
              (SELECT feedback_text FROM complaint_feedback f
               WHERE f.complaint_id = c.complaint_id
                 AND f.resolution_cycle = c.resolution_cycle
               ORDER BY f.created_at DESC LIMIT 1) AS citizen_feedback
       FROM complaints c
       LEFT JOIN users o ON c.officer_id = o.user_id
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      complaints,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  async listByOfficer(officerId, { page = 1, limit = 20, status = null }) {
    const offset = (page - 1) * limit;
    let whereClause = 'c.officer_id = ?';
    const params = [officerId];

    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    const countRows = await db.query(
      `SELECT COUNT(*) as total FROM complaints c WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const complaints = await db.query(
      `SELECT c.*,
              u.name AS citizen_name,
             (SELECT h.reason
              FROM complaint_status_history h
              WHERE h.complaint_id = c.complaint_id
                AND h.new_status = 'RESOLUTION_REJECTED'
              ORDER BY h.created_at DESC
              LIMIT 1) AS resolution_rejection_reason,
             (SELECT v.feedback_text
              FROM complaint_resolution_verifications v
              WHERE v.complaint_id = c.complaint_id
                AND v.resolution_cycle = c.resolution_cycle - 1
                AND v.decision = 'NOT_RESOLVED'
              ORDER BY v.created_at DESC
              LIMIT 1) AS resolution_verification_feedback,
             (SELECT rating FROM complaint_feedback f
              WHERE f.complaint_id = c.complaint_id
                AND f.resolution_cycle = c.resolution_cycle - 1
                AND f.rating <= 2
              ORDER BY f.created_at DESC LIMIT 1) AS citizen_rating,
             (SELECT feedback_text FROM complaint_feedback f
              WHERE f.complaint_id = c.complaint_id
                AND f.resolution_cycle = c.resolution_cycle - 1
                AND f.rating <= 2
              ORDER BY f.created_at DESC LIMIT 1) AS citizen_feedback
       FROM complaints c
       JOIN users u ON c.user_id = u.user_id
       WHERE ${whereClause}
       ORDER BY
         CASE WHEN c.officer_priority = 'HIGH' THEN 1
              WHEN c.priority = 'HIGH' THEN 2
              WHEN c.officer_priority = 'MEDIUM' THEN 3
              WHEN c.priority = 'MEDIUM' THEN 4
              ELSE 5 END,
         c.deadline ASC,
         c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      complaints,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data, client = null) {
    const executor = client || db;
    const result = await executeInsert(executor,
      `INSERT INTO complaints
       (title, description, category, sub_category, location, latitude, longitude, image, status, priority, user_id, resolution_cycle, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [
        data.title,
        data.description,
        data.category,
        data.sub_category || null,
        data.location,
        data.latitude || null,
        data.longitude || null,
        data.image || null,
        data.priority || 'MEDIUM',
        data.user_id,
      ]
    );
    return result.insertId;
  }

  async addAttachment(data, client = null) {
    const executor = client || db;
    const result = await executeInsert(executor,
      `INSERT INTO complaint_attachments (complaint_id, attachment_type, file_path, mime_type, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [data.complaint_id, data.attachment_type, data.file_path, data.mime_type, data.uploaded_by]
    );
    return result.insertId;
  }

  async getAttachments(complaintId) {
    return await db.query(
      `SELECT * FROM complaint_attachments WHERE complaint_id = ? ORDER BY created_at ASC`,
      [complaintId]
    );
  }

  async assignOfficer(complaintId, { officer_id, priority, deadline }, client = null) {
    const executor = client || db;
    const updates = ['status = "ASSIGNED"', 'officer_id = ?', 'updated_at = UTC_TIMESTAMP()'];
    const params = [officer_id];

    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (deadline) {
      updates.push('deadline = ?');
      params.push(deadline);
    }

    params.push(complaintId);
    let whereClause = 'complaint_id = ?';

    if (client) {
      whereClause += ' AND status = ? AND officer_id IS NULL';
      params.push('PENDING');
    }

    const result = await executor.query(
      `UPDATE complaints
       SET ${updates.join(', ')}
       WHERE ${whereClause}`,
      params
    );
    return result;
  }

  async updatePriority(complaintId, priority, client = null) {
    const executor = client || db;
    await executor.query(
      `UPDATE complaints SET priority = ?, updated_at = UTC_TIMESTAMP() WHERE complaint_id = ?`,
      [priority, complaintId]
    );
  }

  async updateOfficerPriority(complaintId, officerPriority, client = null) {
    const executor = client || db;
    await executor.query(
      `UPDATE complaints SET officer_priority = ?, updated_at = UTC_TIMESTAMP() WHERE complaint_id = ?`,
      [officerPriority, complaintId]
    );
  }

  async updateDeadline(complaintId, deadline, client = null) {
    const executor = client || db;
    await executor.query(
      `UPDATE complaints SET deadline = ?, updated_at = UTC_TIMESTAMP() WHERE complaint_id = ?`,
      [deadline, complaintId]
    );
  }

  async submitResolution(complaintId, { resolved_by, resolved_notes, resolved_image }, client = null) {
    const executor = client || db;
    await executor.query(
      `UPDATE complaints
       SET status = 'RESOLUTION_PENDING_REVIEW',
           resolved_by = ?,
           resolved_notes = ?,
           resolved_image = ?,
           resolved_at = UTC_TIMESTAMP(),
           updated_at = UTC_TIMESTAMP()
       WHERE complaint_id = ?`,
      [resolved_by, resolved_notes, resolved_image || null, complaintId]
    );
  }

  async setStatus(complaintId, status, client = null) {
    const executor = client || db;
    await executor.query(
      `UPDATE complaints
       SET status = ?, updated_at = UTC_TIMESTAMP()
       WHERE complaint_id = ?`,
      [status, complaintId]
    );
  }

  async verifyResolution(complaintId, resolved, client = null) {
    const executor = client || db;
    await executor.query(
      `UPDATE complaints
       SET status = ?, resolution_cycle = resolution_cycle + ?,
           updated_at = UTC_TIMESTAMP()
       WHERE complaint_id = ?`,
      [resolved ? 'RESOLVED' : 'ASSIGNED', resolved ? 0 : 1, complaintId]
    );
  }

  async reopenToAssigned(complaintId, client = null) {
    const executor = client || db;
    await executor.query(
      `UPDATE complaints
       SET status = 'ASSIGNED',
           resolution_cycle = resolution_cycle + 1,
           updated_at = UTC_TIMESTAMP()
       WHERE complaint_id = ?`,
      [complaintId]
    );
  }

  async addStatusHistory(data, client = null) {
    const executor = client || db;
    const result = await executeInsert(executor,
      `INSERT INTO complaint_status_history (complaint_id, changed_by, old_status, new_status, reason, created_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [data.complaint_id, data.changed_by, data.old_status, data.new_status, data.reason || null]
    );
    return result.insertId;
  }

  async getStatusHistory(complaintId) {
    return await db.query(
      `SELECT h.*, u.name as changed_by_name, u.role as changed_by_role
       FROM complaint_status_history h
       LEFT JOIN users u ON h.changed_by = u.user_id
       WHERE h.complaint_id = ?
       ORDER BY h.created_at ASC`,
      [complaintId]
    );
  }
}

module.exports = new ComplaintRepository();
