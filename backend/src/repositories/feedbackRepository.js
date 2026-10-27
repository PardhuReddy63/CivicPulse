const db = require('../config/db');

async function executeInsert(executor, sql, params) {
  const queryResult = await executor.query(sql, params);
  return Array.isArray(queryResult) ? queryResult[0] : queryResult;
}

class FeedbackRepository {
  async create({ complaint_id, citizen_id, rating, feedback_text, resolution_cycle = 1 }, client = null) {
    const executor = client || db;
    const result = await executeInsert(executor,
      `INSERT INTO complaint_feedback (complaint_id, citizen_id, rating, feedback_text, resolution_cycle, created_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [complaint_id, citizen_id, rating, feedback_text || null, resolution_cycle]
    );
    return result.insertId;
  }

  async findByComplaintId(complaintId) {
    return await db.query(
      `SELECT f.*, u.name as citizen_name
       FROM complaint_feedback f
       JOIN users u ON f.citizen_id = u.user_id
       WHERE f.complaint_id = ?
       ORDER BY f.created_at DESC`,
      [complaintId]
    );
  }

  async hasFeedbackForCycle(complaintId, resolutionCycle, client = db) {
    const rows = await client.query(
      `SELECT feedback_id FROM complaint_feedback
       WHERE complaint_id = ? AND resolution_cycle = ?`,
      [complaintId, resolutionCycle]
    );
    return rows.length > 0;
  }
}

module.exports = new FeedbackRepository();
