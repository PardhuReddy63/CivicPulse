
const express = require('express');
const router = express.Router();

const officerRegistrationController = require('../controllers/officerRegistrationController');

const {
  officerRegistrationValidation,
} = require('../validators/officerRegistrationValidator');

const {
  authenticate,
  requireRole,
} = require('../middleware/auth');

// Public endpoint: list active departments.
router.get(
  '/departments',
  officerRegistrationController.listDepartments
);

// Public endpoint: submit an officer registration application.
router.post(
  '/',
  officerRegistrationValidation,
  officerRegistrationController.submitApplication
);

// Admin-only endpoints: review officer applications.
router.get(
  '/admin',
  authenticate,
  requireRole(['ADMIN']),
  officerRegistrationController.listApplications
);

router.patch(
  '/admin/:requestId/review',
  authenticate,
  requireRole(['ADMIN']),
  officerRegistrationController.reviewApplication
);

// Admin-only endpoint: resend an officer activation email.
router.post(
  '/admin/:requestId/resend-activation',
  authenticate,
  requireRole(['ADMIN']),
  officerRegistrationController.resendActivationEmail
);

module.exports = router;
