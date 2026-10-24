const db = require('../config/db');

class ComplaintRepository {
  async findById(complaintId) {
    const rows = await db.query(
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
       WHERE c.complaint_id = ?`,
      [complaintId]
    );
    return rows[0] || null;
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
              (SELECT rating FROM complaint_feedback f WHERE f.complaint_id = c.complaint_id ORDER BY f.created_at DESC LIMIT 1) AS citizen_rating,
              (SELECT feedback_text FROM complaint_feedback f WHERE f.complaint_id = c.complaint_id ORDER BY f.created_at DESC LIMIT 1) AS citizen_feedback
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
              (SELECT rating FROM complaint_feedback f WHERE f.complaint_id = c.complaint_id ORDER BY f.created_at DESC LIMIT 1) AS citizen_rating,
              (SELECT feedback_text FROM complaint_feedback f WHERE f.complaint_id = c.complaint_id ORDER BY f.created_at DESC LIMIT 1) AS citizen_feedback
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
    const result = await executor.query(
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
    const result = await executor.query(
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
    await executor.query(
      `UPDATE complaints SET ${updates.join(', ')} WHERE complaint_id = ?`,
      params
    );
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

  async markResolved(complaintId, { resolved_by, resolved_notes, resolved_image }, client = null) {
    const executor = client || db;
    await executor.query(
      `UPDATE complaints 
       SET status = 'RESOLVED', 
           resolved_by = ?, 
           resolved_notes = ?, 
           resolved_image = ?, 
           resolved_at = UTC_TIMESTAMP(), 
           updated_at = UTC_TIMESTAMP() 
       WHERE complaint_id = ?`,
      [resolved_by, resolved_notes, resolved_image || null, complaintId]
    );
  }

  async reopenToPending(complaintId, client = null) {
    const executor = client || db;
    await executor.query(
      `UPDATE complaints 
       SET status = 'PENDING', 
           resolution_cycle = resolution_cycle + 1, 
           updated_at = UTC_TIMESTAMP() 
       WHERE complaint_id = ?`,
      [complaintId]
    );
  }

  async addStatusHistory(data, client = null) {
    const executor = client || db;
    const result = await executor.query(
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
       JOIN users u ON h.changed_by = u.user_id
       WHERE h.complaint_id = ?
       ORDER BY h.created_at ASC`,
      [complaintId]
    );
  }
}

module.exports = new ComplaintRepository();
