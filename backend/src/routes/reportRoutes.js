const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// Admin-only reports
router.get('/totals', requireRole(['ADMIN']), reportController.getTotals);
router.get('/recent', requireRole(['ADMIN']), reportController.getRecent);
router.get('/daily', requireRole(['ADMIN']), reportController.getDaily);
router.get('/status', requireRole(['ADMIN']), reportController.getStatus);
router.get('/officers', requireRole(['ADMIN']), reportController.getOfficers);
router.get('/export.xlsx', requireRole(['ADMIN']), reportController.exportExcel);

// Optional Python service proxy
router.get('/analytics/trends', requireRole(['ADMIN']), reportController.getPythonTrends);
router.get('/analytics/workload', requireRole(['ADMIN']), reportController.getPythonWorkload);

// Citizen-only reports
router.get('/me/totals', requireRole(['CITIZEN']), reportController.getCitizenTotals);
router.get('/me/recent', requireRole(['CITIZEN']), reportController.getCitizenRecent);
router.get('/me/daily', requireRole(['CITIZEN']), reportController.getCitizenDaily);
router.get('/me/status', requireRole(['CITIZEN']), reportController.getCitizenStatus);

module.exports = router;
