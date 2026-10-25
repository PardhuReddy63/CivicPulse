const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateImageContents } = upload;
const {
  createComplaintValidation,
  assignComplaintValidation,
  setPriorityValidation,
  setDeadlineValidation,
  officerPriorityValidation,
  resolveComplaintValidation,
  feedbackValidation,
} = require('../validators/complaintValidator');

// All complaint routes require valid authenticated session
router.use(authenticate);

// 1. Citizen creates complaint
router.post(
  '/',
  requireRole(['CITIZEN']),
  upload.single('image'),
  validateImageContents,
  createComplaintValidation,
  complaintController.createComplaint
);

// 2. Admin lists all complaints
router.get('/', requireRole(['ADMIN']), complaintController.listComplaints);

// 3. Citizen lists own complaints
router.get('/mine', requireRole(['CITIZEN']), complaintController.listMyComplaints);

// 4. Officer lists assigned complaints
router.get('/assigned', requireRole(['OFFICER']), complaintController.listAssignedComplaints);

// 5. Admin report view of resolved complaints
router.get('/resolved', requireRole(['ADMIN']), complaintController.listResolvedComplaints);

// 6. View single complaint details
router.get('/:complaintId', complaintController.getComplaintById);

// Evidence files are delivered only after complaint-level authorization.
router.get('/:complaintId/evidence/:type', complaintController.getEvidence);

// 7. Admin assigns officer
router.post(
  '/:complaintId/assign',
  requireRole(['ADMIN']),
  assignComplaintValidation,
  complaintController.assignComplaint
);

// 8. Admin updates deadline
router.patch(
  '/:complaintId/deadline',
  requireRole(['ADMIN']),
  setDeadlineValidation,
  complaintController.setDeadline
);

// 9. Admin updates overall priority
router.put(
  '/:complaintId/priority',
  requireRole(['ADMIN']),
  setPriorityValidation,
  complaintController.setPriority
);

// 10. Assigned officer updates officer priority
router.put(
  '/:complaintId/officer-priority',
  requireRole(['OFFICER']),
  officerPriorityValidation,
  complaintController.setOfficerPriority
);

// 11. Assigned officer resolves complaint
router.post(
  '/:complaintId/resolve',
  requireRole(['OFFICER']),
  upload.single('after_image'),
  validateImageContents,
  resolveComplaintValidation,
  complaintController.resolveComplaint
);

// 12. Citizen owner submits feedback (auto-reopens if rating is 1 or 2)
router.post(
  '/:complaintId/feedback',
  requireRole(['CITIZEN']),
  feedbackValidation,
  complaintController.submitFeedback
);

// 13. Audit and status history
router.get('/:complaintId/history', complaintController.getComplaintHistory);

module.exports = router;
