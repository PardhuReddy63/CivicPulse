const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// Admin-only user management
router.get('/', requireRole(['ADMIN']), userController.listUsers);
router.get('/audit', requireRole(['ADMIN']), userController.listAuditLogs);
router.patch('/:userId/role', requireRole(['ADMIN']), userController.updateRole);
router.patch('/:userId/active', requireRole(['ADMIN']), userController.setActiveStatus);

// Active officers list for assignment dropdowns (accessible by Admin)
router.get('/officers/active', requireRole(['ADMIN']), userController.listOfficers);

// Departments catalog (accessible by authenticated users)
router.get('/meta/departments', userController.listDepartments);

module.exports = router;
