const { body, param, validationResult } = require('express-validator');

function validateResult(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input fields provided.',
        details: errors.array().map(e => ({ field: e.path, message: e.msg })),
      },
    });
  }
  next();
}

const createComplaintValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 10 }),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 100 }),
  body('sub_category').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('location').trim().notEmpty().withMessage('Location is required').isLength({ max: 255 }),
  body('latitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('longitude').custom((longitude, { req }) => {
    const hasLatitude = req.body.latitude !== undefined && req.body.latitude !== '';
    const hasLongitude = longitude !== undefined && longitude !== '';
    if (hasLatitude !== hasLongitude) {
      throw new Error('Latitude and longitude must be provided together.');
    }
    return true;
  }),
  validateResult,
];

const assignComplaintValidation = [
  param('complaintId').isInt({ min: 1 }).withMessage('Valid complaint ID is required'),
  body('officer_id').isInt({ min: 1 }).withMessage('Valid officer_id is required'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Priority must be LOW, MEDIUM, or HIGH'),
  body('deadline').optional().isISO8601().withMessage('Deadline must be in YYYY-MM-DD format'),
  validateResult,
];

const setPriorityValidation = [
  param('complaintId').isInt({ min: 1 }).withMessage('Valid complaint ID is required'),
  body('priority').isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Priority must be LOW, MEDIUM, or HIGH'),
  validateResult,
];

const setDeadlineValidation = [
  param('complaintId').isInt({ min: 1 }).withMessage('Valid complaint ID is required'),
  body('deadline').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Deadline must be in YYYY-MM-DD format'),
  validateResult,
];

const officerPriorityValidation = [
  param('complaintId').isInt({ min: 1 }).withMessage('Valid complaint ID is required'),
  body('officer_priority').isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Officer priority must be LOW, MEDIUM, or HIGH'),
  validateResult,
];

const resolveComplaintValidation = [
  param('complaintId').isInt({ min: 1 }).withMessage('Valid complaint ID is required'),
  body('resolved_notes').trim().notEmpty().withMessage('Resolution notes describing work completed are required').isLength({ min: 10 }),
  validateResult,
];

const feedbackValidation = [
  param('complaintId').isInt({ min: 1 }).withMessage('Valid complaint ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('feedback_text')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback text must not exceed 1000 characters'),
  validateResult,
];

module.exports = {
  createComplaintValidation,
  assignComplaintValidation,
  setPriorityValidation,
  setDeadlineValidation,
  officerPriorityValidation,
  resolveComplaintValidation,
  feedbackValidation,
};
