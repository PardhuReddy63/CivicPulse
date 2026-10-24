const reportService = require('../services/reportService');

class ReportController {
  async getTotals(req, res, next) {
    try {
      const data = await reportService.getAdminTotals();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getRecent(req, res, next) {
    try {
      const data = await reportService.getAdminRecent();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getDaily(req, res, next) {
    try {
      const data = await reportService.getAdminDaily();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req, res, next) {
    try {
      const data = await reportService.getAdminStatus();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getOfficers(req, res, next) {
    try {
      const data = await reportService.getAdminOfficerWorkload();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getCitizenTotals(req, res, next) {
    try {
      const data = await reportService.getCitizenTotals(req.user.user_id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getCitizenRecent(req, res, next) {
    try {
      const data = await reportService.getCitizenRecent(req.user.user_id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getCitizenDaily(req, res, next) {
    try {
      const data = await reportService.getCitizenDaily(req.user.user_id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getCitizenStatus(req, res, next) {
    try {
      const data = await reportService.getCitizenStatus(req.user.user_id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const buffer = await reportService.generateExcelReport();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=civicpulse_report_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async getPythonTrends(req, res, next) {
    try {
      const data = await reportService.fetchPythonAnalytics('trends');
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getPythonWorkload(req, res, next) {
    try {
      const data = await reportService.fetchPythonAnalytics('workload');
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportController();
