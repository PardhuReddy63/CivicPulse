const db = require('../config/db');
const XLSX = require('xlsx');
const config = require('../config/env');

class ReportService {
  async getAdminTotals() {
    const rows = await db.query(
      `SELECT status, COUNT(*) as count FROM complaints GROUP BY status`
    );
    const totals = {
      PENDING: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      RESOLUTION_REJECTED: 0,
      RESOLUTION_PENDING_REVIEW: 0,
      AWAITING_CITIZEN: 0,
      RESOLVED: 0,
      TOTAL: 0,
    };
    rows.forEach(r => {
      totals[r.status] = r.count;
      totals.TOTAL += r.count;
    });
    return totals;
  }

  async getAdminRecent() {
    return await db.query(
      `SELECT c.complaint_id, c.title, c.category, c.status, c.priority, c.created_at,
              u.name as citizen_name, o.name as officer_name
       FROM complaints c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users o ON c.officer_id = o.user_id
       ORDER BY c.created_at DESC
       LIMIT 10`
    );
  }

  async getAdminDaily() {
    return await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM complaints
       WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '14 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );
  }

  async getAdminStatus() {
    const rows = await db.query(
      `SELECT status, COUNT(*) as count FROM complaints GROUP BY status`
    );
    const total = rows.reduce((acc, curr) => acc + curr.count, 0) || 1;
    return rows.map(r => ({
      status: r.status,
      count: r.count,
      percentage: Number(((r.count / total) * 100).toFixed(1)),
    }));
  }

  async getAdminOfficerWorkload() {
    return await db.query(
      `SELECT u.user_id, u.name, d.name as department_name,
              COUNT(c.complaint_id) as total_assigned,
              SUM(CASE WHEN c.status IN ('ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_REJECTED', 'RESOLUTION_PENDING_REVIEW', 'AWAITING_CITIZEN') THEN 1 ELSE 0 END) as active_cases,
              SUM(CASE WHEN c.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_cases,
              SUM(CASE WHEN c.status IN ('ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_REJECTED') AND c.deadline < CURRENT_DATE() THEN 1 ELSE 0 END) as overdue_cases
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       LEFT JOIN complaints c ON u.user_id = c.officer_id
       WHERE u.role = 'OFFICER' AND u.active = TRUE
       GROUP BY u.user_id, u.name, d.name
       ORDER BY active_cases DESC, u.name ASC`
    );
  }

  // Citizen personal reports
  async getCitizenTotals(userId) {
    const rows = await db.query(
      `SELECT status, COUNT(*) as count FROM complaints WHERE user_id = ? GROUP BY status`,
      [userId]
    );
    const totals = {
      PENDING: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      RESOLUTION_REJECTED: 0,
      RESOLUTION_PENDING_REVIEW: 0,
      AWAITING_CITIZEN: 0,
      RESOLVED: 0,
      TOTAL: 0,
    };
    rows.forEach(r => {
      totals[r.status] = r.count;
      totals.TOTAL += r.count;
    });
    return totals;
  }

  async getCitizenRecent(userId) {
    return await db.query(
      `SELECT complaint_id, title, category, status, priority, created_at, updated_at
       FROM complaints
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );
  }

  async getCitizenDaily(userId) {
    return await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM complaints
       WHERE user_id = ? AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [userId]
    );
  }

  async getCitizenStatus(userId) {
    const rows = await db.query(
      `SELECT status, COUNT(*) as count FROM complaints WHERE user_id = ? GROUP BY status`,
      [userId]
    );
    const total = rows.reduce((acc, curr) => acc + curr.count, 0) || 1;
    return rows.map(r => ({
      status: r.status,
      count: r.count,
      percentage: Number(((r.count / total) * 100).toFixed(1)),
    }));
  }

  async generateExcelReport() {
    const complaints = await db.query(
      `SELECT c.complaint_id, c.title, c.category, c.sub_category, c.location,
              c.status, c.priority, c.officer_priority, c.deadline,
              u.name as citizen_name, u.email as citizen_email,
              o.name as officer_name,
              c.created_at, c.resolved_at, c.resolution_cycle,
              (SELECT rating FROM complaint_feedback f WHERE f.complaint_id = c.complaint_id ORDER BY f.created_at DESC LIMIT 1) as latest_rating,
              (SELECT feedback_text FROM complaint_feedback f WHERE f.complaint_id = c.complaint_id ORDER BY f.created_at DESC LIMIT 1) as latest_feedback
       FROM complaints c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users o ON c.officer_id = o.user_id
       ORDER BY c.created_at DESC`
    );

    const officers = await this.getAdminOfficerWorkload();

    const wb = XLSX.utils.book_new();

    const complaintsSheet = XLSX.utils.json_to_sheet(complaints);
    XLSX.utils.book_append_sheet(wb, complaintsSheet, 'Complaints Registry');

    const officersSheet = XLSX.utils.json_to_sheet(officers);
    XLSX.utils.book_append_sheet(wb, officersSheet, 'Officer Workload');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async fetchPythonAnalytics(analysisType = 'trends') {
    if (!config.PYTHON_SERVICE_URL || !config.PYTHON_SERVICE_TOKEN) {
      return {
        available: false,
        notice: 'Python analytics is not configured. Set its URL and matching internal token to enable analytics.',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const endpoint = analysisType === 'workload' ? '/api/v1/analyze/workload' : '/api/v1/analyze/trends';

      // Gather bounded non-sensitive data for Python service
      const rawComplaints = await db.query(
        `SELECT complaint_id, category, status, priority, created_at, deadline, resolved_at, resolution_cycle
         FROM complaints
         ${analysisType === 'trends' ? "WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'" : ''}`
      );

      const response = await fetch(`${config.PYTHON_SERVICE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.PYTHON_SERVICE_TOKEN}`,
        },
        body: JSON.stringify({
          complaints: rawComplaints,
          window_days: 30,
        }),
      });

      if (!response.ok) {
        throw new Error(`Python service responded with status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[Python Analytics] Service currently unavailable:', err.message);
      // Graceful fallback per section 12: core grievance workflow continues
      return {
        available: false,
        notice: 'Python analytics service is currently offline. Showing local analytics indicators.',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

module.exports = new ReportService();
