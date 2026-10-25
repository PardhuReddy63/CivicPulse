const { body, validationResult } = require('express-validator');

function validateResult(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input fields provided.',
        details: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
        })),
      },
    });
  }

  return next();
}

const officerRegistrationValidation = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .bail()
    .isLength({ max: 255 })
    .withMessage('Full name must not exceed 255 characters.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .bail()
    .isEmail()
    .withMessage('Enter a valid email address.')
    .bail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters.')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required.')
    .bail()
    .isLength({ min: 7, max: 30 })
    .withMessage('Phone number must be between 7 and 30 characters.')
    .bail()
    .matches(/^[+\d][\d\s().-]*$/)
    .withMessage('Enter a valid phone number.'),

  body('department_id')
    .notEmpty()
    .withMessage('Department is required.')
    .bail()
    .isInt({ min: 1 })
    .withMessage('Select a valid department.')
    .toInt(),

  body('designation')
    .trim()
    .notEmpty()
    .withMessage('Designation is required.')
    .bail()
    .isLength({ max: 150 })
    .withMessage('Designation must not exceed 150 characters.'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Please explain why you want to register as an officer.')
    .bail()
    .isLength({ max: 5000 })
    .withMessage('Reason must not exceed 5000 characters.'),

  validateResult,
];

module.exports = {
  officerRegistrationValidation,
};
