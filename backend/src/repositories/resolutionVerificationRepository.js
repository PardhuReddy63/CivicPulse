const db = require('../config/db');

async function executeInsert(executor, sql, params) {
  const result = await executor.query(sql, params);
  return Array.isArray(result) ? result[0] : result;
}

class ResolutionVerificationRepository {
  async create({ complaint_id, resolution_cycle, citizen_id, decision, feedback_text }, client) {
    const executor = client || db;
    const result = await executeInsert(executor,
      `INSERT INTO complaint_resolution_verifications
        (complaint_id, resolution_cycle, citizen_id, decision, feedback_text, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       RETURNING verification_id`,
      [complaint_id, resolution_cycle, citizen_id, decision, feedback_text || null]
    );
    return result.insertId;
  }

  async hasVerificationForCycle(complaintId, resolutionCycle, client = db) {
    const rows = await client.query(
      `SELECT verification_id
       FROM complaint_resolution_verifications
       WHERE complaint_id = ? AND resolution_cycle = ?`,
      [complaintId, resolutionCycle]
    );
    return rows.length > 0;
  }

  async findByComplaintId(complaintId) {
    return await db.query(
      `SELECT v.*, u.name AS citizen_name
       FROM complaint_resolution_verifications v
       JOIN users u ON v.citizen_id = u.user_id
       WHERE v.complaint_id = ?
       ORDER BY v.created_at DESC`,
      [complaintId]
    );
  }
}

module.exports = new ResolutionVerificationRepository();
