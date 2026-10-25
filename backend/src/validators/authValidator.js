const { body, validationResult } = require('express-validator');

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

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('role')
    .optional()
    .isIn(['CITIZEN'])
    .withMessage('Public registration is only available for citizens.'),
  validateResult,
];

const loginValidation = [
  body('identifier')
    .custom((value, { req }) => {
      const candidate = typeof value === 'string' && value.trim()
        ? value
        : req.body.email;
      if (typeof candidate !== 'string' || !candidate.trim() || candidate.trim().length > 254) {
        throw new Error('Username or email is required (maximum 254 characters).');
      }
      req.body.identifier = candidate.trim();
      return true;
    }),
  body('password').notEmpty().withMessage('Password is required'),
  validateResult,
];

const changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters.'),
  body('confirm_password')
    .custom((value, { req }) => value === req.body.new_password)
    .withMessage('Password confirmation does not match.'),
  validateResult,
];

const verifyOtpValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),
  validateResult,
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  validateResult,
];

const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validateResult,
];

const officerActivationValidation = [
  body('token')
    .trim()
    .isLength({ min: 64, max: 64 })
    .isHexadecimal()
    .withMessage('A valid activation token is required.'),

  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters.'),

  validateResult,
];

module.exports = {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  officerActivationValidation,
};
